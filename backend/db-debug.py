#!/usr/bin/env python
"""
Script to check the database structure and verify the system_prompt column exists
"""
import sqlite3
import os
import sys

def check_database(db_path):
    """
    Check if the system_prompt column exists in the prompt_versions table
    """
    print(f"Checking database at {db_path}")
    
    # Connect to the database
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return False
    
    try:
        # Check table structure
        cursor.execute("PRAGMA table_info(prompt_versions)")
        columns = cursor.fetchall()
        
        print("Prompt Versions table columns:")
        column_names = []
        for col in columns:
            col_id, name, type_, notnull, default, pk = col
            column_names.append(name)
            print(f"  {name} ({type_})")
        
        if "system_prompt" in column_names:
            print("✅ system_prompt column exists!")
        else:
            print("❌ system_prompt column NOT found!")
            
        # Check for any existing data in system_prompt column
        if "system_prompt" in column_names:
            cursor.execute("SELECT id, version_number, prompt_id, system_prompt FROM prompt_versions")
            versions = cursor.fetchall()
            
            print(f"\nFound {len(versions)} prompt versions")
            for version in versions:
                version_id, version_number, prompt_id, system_prompt = version
                print(f"  Version {version_id} (#{version_number} for prompt {prompt_id})")
                print(f"  System prompt: {system_prompt or 'None'}")
                print()
            
    except Exception as e:
        print(f"Error checking database structure: {e}")
        return False
    finally:
        conn.close()
        
    return True

if __name__ == "__main__":
    # Default database path
    default_db_path = "./llm_evaluator.db"
    
    # Get the database path from arguments or use default
    db_path = sys.argv[1] if len(sys.argv) > 1 else default_db_path
    
    check_database(db_path)
