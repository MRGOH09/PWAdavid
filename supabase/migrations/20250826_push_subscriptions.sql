-- 创建推送订阅表
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh text NOT NULL, 
    auth text NOT NULL,
    user_agent text,
    device_info jsonb,
    created_at timestamptz DEFAULT now(),
    last_used timestamptz DEFAULT now(),
    
    UNIQUE(user_id, endpoint)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON push_subscriptions(created_at);

-- 添加RLS策略
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 用户只能管理自己的推送订阅
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- 管理员可以查看所有推送订阅（用于cron任务）
CREATE POLICY "Service role can access all push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.role() = 'service_role');