-- Create audit logging function for PostgreSQL
-- This function safely inserts audit logs and returns the audit ID

CREATE OR REPLACE FUNCTION log_audit_action(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    -- Generate a new UUID for the audit log
    audit_id := gen_random_uuid();
    
    -- Insert audit log record
    INSERT INTO audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        session_id,
        request_id,
        metadata,
        created_at
    ) VALUES (
        audit_id,
        p_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_old_values,
        p_new_values,
        p_ip_address,
        p_user_agent,
        p_session_id,
        p_request_id,
        p_metadata,
        NOW()
    );
    
    RETURN audit_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to insert audit log: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the application user
GRANT EXECUTE ON FUNCTION log_audit_action TO gestagent_user;

COMMENT ON FUNCTION log_audit_action IS 'Safely logs audit actions and returns audit ID or NULL on error';