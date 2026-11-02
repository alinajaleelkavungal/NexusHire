export const SECTOR_CATEGORY_MAP: Record<string, string[]> = {
  "Medical": ["Nurse", "Doctor", "Lab Technician", "Pharmacist", "Radiologist"],
  "IT": ["Software Developer", "QA Engineer", "DevOps Engineer", "Data Analyst", "Network Admin"],
  "Mechanical": ["Mechanical Engineer", "Maintenance Technician", "Machinist"],
  "Engineering": ["Civil Engineer", "Electrical Engineer", "Structural Engineer"],
  "Finance": ["Accountant", "Financial Analyst", "Auditor", "Investment Banker"],
  "Sales": ["Sales Representative", "Account Executive", "Sales Manager"],
  "Marketing": ["Marketing Specialist", "SEO Expert", "Content Creator", "Social Media Manager"],
  "HR": ["HR Manager", "Recruiter", "Employee Relations Specialist"],
  "Other": ["Other"]
};

/**
 * Automatically infers Category (sector) and Sub Category (category)
 * based on a job vacancy title.
 */
export function matchSectorAndCategory(jobTitle?: string | null): { sector: string; category: string } {
  if (!jobTitle) return { sector: '', category: '' }
  const title = jobTitle.trim().toLowerCase()

  // 1. Direct subcategory check across SECTOR_CATEGORY_MAP
  for (const [sec, subcats] of Object.entries(SECTOR_CATEGORY_MAP)) {
    for (const sub of subcats) {
      if (sub === 'Other') continue
      const subLower = sub.toLowerCase()
      if (title.includes(subLower)) {
        return { sector: sec, category: sub }
      }
    }
  }

  // 2. Comprehensive role pattern matching
  const rules: Array<{ patterns: string[]; sector: string; category: string }> = [
    // Medical
    { patterns: ['doctor', 'physician', 'surgeon', 'mbbs', 'md', 'consultant doctor', 'pediatrician', 'cardiologist', 'dermatologist', 'gynecologist'], sector: 'Medical', category: 'Doctor' },
    { patterns: ['nurse', 'nursing', 'staff nurse', 'anm', 'gnm', 'sister', 'matron'], sector: 'Medical', category: 'Nurse' },
    { patterns: ['lab tech', 'lab', 'laboratory', 'pathology', 'phlebotomist', 'histopath'], sector: 'Medical', category: 'Lab Technician' },
    { patterns: ['pharm', 'chemist', 'pharmacist', 'druggist', 'apothecary'], sector: 'Medical', category: 'Pharmacist' },
    { patterns: ['radiolog', 'radiography', 'radiologist', 'x-ray', 'ct scan', 'mri', 'ultrasound', 'sonograph', 'technologist'], sector: 'Medical', category: 'Radiologist' },
    { patterns: ['physio', 'physiotherapist', 'rehab', 'occupational therapist'], sector: 'Medical', category: 'Nurse' },
    { patterns: ['medical', 'hospital', 'clinic', 'healthcare', 'dental', 'dentist'], sector: 'Medical', category: 'Doctor' },

    // IT
    { patterns: ['software', 'developer', 'frontend', 'backend', 'fullstack', 'react', 'next', 'node', 'python', 'java', 'web dev', 'programmer', 'coder', 'engineer it', 'mobile dev', 'android', 'ios', 'flutter'], sector: 'IT', category: 'Software Developer' },
    { patterns: ['qa', 'tester', 'testing', 'quality assurance', 'test engineer', 'automation test', 'manual test', 'sdet'], sector: 'IT', category: 'QA Engineer' },
    { patterns: ['devops', 'cloud', 'sre', 'aws', 'azure', 'docker', 'kubernetes', 'infrastructure', 'platform engineer'], sector: 'IT', category: 'DevOps Engineer' },
    { patterns: ['data', 'analytics', 'bi analyst', 'business intelligence', 'data analyst', 'data scientist', 'sql', 'big data', 'database admin', 'dba'], sector: 'IT', category: 'Data Analyst' },
    { patterns: ['network', 'sysadmin', 'system admin', 'systems administrator', 'desktop support', 'it support', 'helpdesk', 'system engineer'], sector: 'IT', category: 'Network Admin' },
    { patterns: ['it', 'tech', 'technology', 'cyber', 'security analyst', 'information security'], sector: 'IT', category: 'Software Developer' },

    // Mechanical
    { patterns: ['mechanical', 'hvac', 'ac technician', 'welder', 'fitter', 'machinist', 'cnc', 'lathe', 'tool', 'boiler', 'millwright', 'piping'], sector: 'Mechanical', category: 'Mechanical Engineer' },
    { patterns: ['maintenance', 'technician', 'service engineer', 'repair', 'electric motor'], sector: 'Mechanical', category: 'Maintenance Technician' },

    // Engineering
    { patterns: ['civil', 'site engineer', 'surveyor', 'construction', 'structural engineer', 'architect', 'quantity surveyor', 'autocad'], sector: 'Engineering', category: 'Civil Engineer' },
    { patterns: ['electrical', 'electrician', 'wiring', 'instrumentation', 'electronics', 'power engineer', 'substation'], sector: 'Engineering', category: 'Electrical Engineer' },

    // Finance
    { patterns: ['account', 'accountant', 'tally', 'cashier', 'bookkeeper', 'finance', 'financial', 'taxation', 'gst', 'billing', 'accounts executive'], sector: 'Finance', category: 'Accountant' },
    { patterns: ['analyst', 'financial analyst', 'risk analyst', 'credit analyst', 'valuation'], sector: 'Finance', category: 'Financial Analyst' },
    { patterns: ['auditor', 'audit', 'tax consultant', 'ca ', 'chartered accountant'], sector: 'Finance', category: 'Auditor' },
    { patterns: ['banker', 'banking', 'investment', 'wealth management', 'fund'], sector: 'Finance', category: 'Investment Banker' },

    // Sales
    { patterns: ['sales', 'bdo', 'bde', 'business development', 'telecaller', 'telesales', 'counter sales', 'showroom', 'sales rep', 'representative trainee', 'trainee sales'], sector: 'Sales', category: 'Sales Representative' },
    { patterns: ['sales manager', 'sales lead', 'regional manager', 'area sales', 'branch manager'], sector: 'Sales', category: 'Sales Manager' },
    { patterns: ['account executive', 'client executive', 'key account'], sector: 'Sales', category: 'Account Executive' },

    // Marketing
    { patterns: ['marketing', 'brand', 'digital marketing', 'advertising', 'growth marketing'], sector: 'Marketing', category: 'Marketing Specialist' },
    { patterns: ['seo', 'sem', 'google ads', 'meta ads', 'ppc'], sector: 'Marketing', category: 'SEO Expert' },
    { patterns: ['content', 'writer', 'copywriter', 'creator', 'videographer', 'graphic designer', 'ui/ux', 'designer'], sector: 'Marketing', category: 'Content Creator' },
    { patterns: ['social media', 'smm', 'community manager'], sector: 'Marketing', category: 'Social Media Manager' },

    // HR
    { patterns: ['hr manager', 'hr generalist', 'hr executive', 'human resource manager'], sector: 'HR', category: 'HR Manager' },
    { patterns: ['recruiter', 'recruiting', 'talent acquisition', 'sourcer', 'hiring specialist'], sector: 'HR', category: 'Recruiter' },
    { patterns: ['hr', 'front desk', 'receptionist', 'reception', 'office assistant', 'admin', 'coordinator', 'executive assistant', 'secretary'], sector: 'HR', category: 'Employee Relations Specialist' },
  ]

  for (const rule of rules) {
    if (rule.patterns.some(p => title.includes(p))) {
      return { sector: rule.sector, category: rule.category }
    }
  }

  // 3. Check if any sector name itself matches
  for (const sec of Object.keys(SECTOR_CATEGORY_MAP)) {
    if (sec === 'Other') continue
    if (title.includes(sec.toLowerCase())) {
      return { sector: sec, category: SECTOR_CATEGORY_MAP[sec]?.[0] || 'Other' }
    }
  }

  return { sector: 'Other', category: 'Other' }
}
