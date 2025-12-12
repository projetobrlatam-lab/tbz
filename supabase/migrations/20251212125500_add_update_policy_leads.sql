CREATE POLICY "Anon Update Leads" ON tbz.leads
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
