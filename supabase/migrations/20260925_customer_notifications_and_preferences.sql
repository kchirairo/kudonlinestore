-- ==============================================================================
-- KUD STORE - CUSTOMER NOTIFICATIONS, PREFERENCES & PUSH SUBSCRIPTIONS
-- Connects order creation, Yoco payments, status changes, shipping & delivery.
-- ==============================================================================

-- 1. Create public.notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    order_id UUID,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist seamlessly if table was previously created
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id) WHERE order_id IS NOT NULL;

-- Unique partial index on user_id + fingerprint to prevent duplicate notifications
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_fingerprint
ON public.notifications(user_id, fingerprint)
WHERE fingerprint IS NOT NULL AND fingerprint != '';

-- 2. Create public.notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    order_updates BOOLEAN DEFAULT true,
    payment_updates BOOLEAN DEFAULT true,
    shipping_updates BOOLEAN DEFAULT true,
    delivery_updates BOOLEAN DEFAULT true,
    promotions BOOLEAN DEFAULT false,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    in_app_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS order_updates BOOLEAN DEFAULT true;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS payment_updates BOOLEAN DEFAULT true;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS shipping_updates BOOLEAN DEFAULT true;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS delivery_updates BOOLEAN DEFAULT true;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS promotions BOOLEAN DEFAULT false;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS in_app_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- 3. Create public.push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT,
    auth TEXT,
    subscription_json JSONB DEFAULT '{}'::jsonb,
    device_type TEXT DEFAULT 'browser',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS p256dh TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS auth TEXT;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS subscription_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'browser';
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(user_id, endpoint);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for public.notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users or server can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users or server can insert notifications"
    ON public.notifications FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 6. RLS Policies for public.notification_preferences
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own notification preferences"
    ON public.notification_preferences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can upsert their own notification preferences"
    ON public.notification_preferences FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own notification preferences"
    ON public.notification_preferences FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. RLS Policies for public.push_subscriptions
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
