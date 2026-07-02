const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const filePath = path.resolve(process.cwd(), 'db/apps.json');
const raw = fs.readFileSync(filePath, 'utf-8');
const apps = JSON.parse(raw);

const rows = apps.map((app) => ({
  id: app.id,
  name: app.name,
  description: app.description,
  category: app.category,
  tags: app.tags,
  downloads: app.downloads,
  rating: app.rating,
  verified: app.verified,
  link: app.link,
  github_url: app.github_url || app.githubUrl || app.repository || app.repo || '',
  imgcid: app.imgCID,
}));

async function run() {
  const { data, error } = await supabase
    .from('bbox_apps')
    .upsert(rows, { onConflict: ['id'] });

  if (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }

  console.log(`Imported ${data ? data.length : rows.length} apps into bbox_apps`);
}

run();
