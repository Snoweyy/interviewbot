-- Conversation turns table for storing interview transcripts
CREATE TABLE conversation_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    speaker_type VARCHAR(20) NOT NULL CHECK (speaker_type IN ('user', 'ai')),
    text TEXT NOT NULL,
    audio_url TEXT,
    confidence FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_turns_session_id ON conversation_turns(session_id);
CREATE INDEX idx_turns_created_at ON conversation_turns(created_at);

-- Enable RLS
ALTER TABLE conversation_turns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view conversation turns for their sessions" ON conversation_turns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM interview_sessions 
            WHERE interview_sessions.id = session_id 
            AND interview_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversation turns for their sessions" ON conversation_turns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM interview_sessions 
            WHERE interview_sessions.id = session_id 
            AND interview_sessions.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT ON conversation_turns TO anon;
GRANT ALL PRIVILEGES ON conversation_turns TO authenticated;