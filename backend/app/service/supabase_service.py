# app/services/supabase_service.py
from app.utils.supabase_client import get_supabase_client
from flask import current_app
import json


class SupabaseService:
    @staticmethod
    def store_file(file, file_name, bucket="profiles"):
        """Store a file in Supabase Storage"""
        client = get_supabase_client()
        
        # Upload file
        result = client.storage.from_(bucket).upload(file_name, file)
        
        # Get public URL
        public_url = client.storage.from_(bucket).get_public_url(file_name)
        
        return {
            "file_name": file_name,
            "public_url": public_url,
            "bucket": bucket,
            "result": result
        }
    
    @staticmethod
    def delete_file(file_name, bucket="profiles"):
        """Delete a file from Supabase Storage"""
        client = get_supabase_client()
        
        try:
            result = client.storage.from_(bucket).remove([file_name])
            return {"success": True, "result": result}
        except Exception as e:
            current_app.logger.error(f"Error deleting file from Supabase: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def realtime_subscribe(channel, event, callback):
        """Subscribe to Supabase Realtime events"""
        client = get_supabase_client()
        
        # Subscribe to realtime updates
        return client.realtime.channel(channel).on(
            event,
            callback
        ).subscribe()
    
    @staticmethod
    def raw_query(query, params=None):
        """Execute a raw PostgreSQL query"""
        client = get_supabase_client()
        
        try:
            result = client.rpc('run_query', {
                'query': query, 
                'params': json.dumps(params) if params else '{}'
            }).execute()
            
            return result.data
        except Exception as e:
            current_app.logger.error(f"Error executing raw query: {e}")
            return None