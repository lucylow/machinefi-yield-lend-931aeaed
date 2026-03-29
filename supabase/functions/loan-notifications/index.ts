import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type NotificationType = 'liquidation_warning' | 'repayment_due' | 'loan_approved' | 'interest_accrued' | 'collateral_update';

interface NotificationRequest {
  type: NotificationType;
  walletAddress: string;
  loanId?: string;
  data?: Record<string, unknown>;
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  walletAddress: string;
  loanId?: string;
  timestamp: string;
  read: boolean;
}

const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; message: (data?: Record<string, unknown>) => string; severity: Notification['severity'] | ((data?: Record<string, unknown>) => Notification['severity']) }> = {
  liquidation_warning: {
    title: '⚠️ Liquidation Warning',
    message: (data) => `Your loan${data?.loanId ? ` #${data.loanId}` : ''} health factor has dropped to ${data?.healthFactor || 'critical levels'}. Add collateral or repay to avoid liquidation.`,
    severity: 'critical',
  },
  repayment_due: {
    title: '📅 Repayment Due',
    message: (data) => `Payment of $${data?.amount || '0'} is due${data?.dueDate ? ` on ${data.dueDate}` : ' soon'}. Avoid late fees by paying on time.`,
    severity: 'warning',
  },
  loan_approved: {
    title: '✅ Loan Approved',
    message: (data) => `Your loan of $${data?.amount || '0'} has been approved. Funds will be available in your wallet shortly.`,
    severity: 'info',
  },
  interest_accrued: {
    title: '💰 Interest Accrued',
    message: (data) => `$${data?.interest || '0'} interest has been added to your loan. Total outstanding: $${data?.totalDebt || '0'}.`,
    severity: 'info',
  },
  collateral_update: {
    title: '🔄 Collateral Value Update',
    message: (data) => `Your collateral value has changed to $${data?.newValue || '0'} (${data?.changePercent || '0'}% change). Current LTV: ${data?.ltv || '0'}%.`,
    severity: (data) => {
      const ltv = Number(data?.ltv || 0);
      return ltv > 75 ? 'critical' : ltv > 60 ? 'warning' : 'info';
    },
  },
};

// In-memory store (demo purposes — replace with DB in production)
const notifications: Notification[] = [];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // GET: Fetch notifications for a wallet
    if (req.method === 'GET') {
      const wallet = url.searchParams.get('wallet');
      if (!wallet) {
        return new Response(JSON.stringify({ error: 'Missing wallet parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userNotifs = notifications
        .filter(n => n.walletAddress.toLowerCase() === wallet.toLowerCase())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return new Response(JSON.stringify({ notifications: userNotifs, count: userNotifs.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: Create a notification
    if (req.method === 'POST') {
      const body: NotificationRequest = await req.json();
      const { type, walletAddress, loanId, data } = body;

      if (!type || !walletAddress) {
        return new Response(JSON.stringify({ error: 'Missing required fields: type, walletAddress' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const template = NOTIFICATION_TEMPLATES[type];
      if (!template) {
        return new Response(JSON.stringify({ error: `Unknown notification type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const severity = typeof template.severity === 'function' ? template.severity(data) : template.severity;

      const notification: Notification = {
        id: crypto.randomUUID(),
        type,
        title: template.title,
        message: template.message(data),
        severity,
        walletAddress,
        loanId,
        timestamp: new Date().toISOString(),
        read: false,
      };

      notifications.push(notification);

      // Keep only last 100 notifications per wallet (memory management)
      const walletNotifs = notifications.filter(n => n.walletAddress === walletAddress);
      if (walletNotifs.length > 100) {
        const toRemove = walletNotifs.slice(0, walletNotifs.length - 100);
        toRemove.forEach(n => {
          const idx = notifications.indexOf(n);
          if (idx > -1) notifications.splice(idx, 1);
        });
      }

      return new Response(JSON.stringify({ success: true, notification }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
