# Supabase Setup Guide

### 1. Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Go to **Project Settings > API**.
3. Copy the **Project URL** and **anon/public Key**.
   - Note: The key usually starts with `eyJ...`.
4. Update `constants.ts` with these values.

### 2. Run SQL Query
1. Open the file `setup_database.sql` in this project.
2. Copy **all** the text from that file.
3. Go to the **SQL Editor** in your Supabase Dashboard (icon on the left).
4. Paste the text and click **Run**.
   - **Do not** paste markdown backticks (```) or descriptions, just the SQL commands.

### 3. Verify
Once run, you should see "Success" in the results pane. Your app is now ready to store data.
