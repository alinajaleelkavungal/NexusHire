const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const existing = await p.$queryRawUnsafe('SELECT title FROM Vacancy');
  const titles = new Set(existing.map(x => (x.title || '').toLowerCase().trim()));
  console.log('Existing titles:', Array.from(titles));

  const items = [
    { id: 'vac_sales_rep_01', title: 'Sales Representative Trainee', company: 'Tigrid Technologies', location: 'Kochi branch', openings: 2, closingDate: '2026-11-30', createdAt: new Date('2026-10-20T10:00:00Z').getTime() },
    { id: 'vac_lab_tech_01', title: 'Lab Technician', company: 'Riyadh Central Lab', location: 'Riyadh branch', openings: 5, closingDate: '2026-10-30', createdAt: new Date('2026-10-02T10:00:00Z').getTime() },
    { id: 'vac_pharm_01', title: 'Pharmacist', company: 'al aberr', location: 'Jeddah branch', openings: 3, closingDate: '2026-12-15', createdAt: new Date('2026-10-12T10:00:00Z').getTime() },
    { id: 'vac_rad_tech_01', title: 'Radiology Technologist', company: 'Al Noor Medical City', location: 'Dubai branch', openings: 6, closingDate: '2026-12-20', createdAt: new Date('2026-10-09T10:00:00Z').getTime() },
    { id: 'vac_front_desk_01', title: 'Front Desk Executive', company: 'Riyadh Central Lab', location: 'Riyadh branch', openings: 1, closingDate: '2026-11-02', createdAt: new Date('2026-10-01T10:00:00Z').getTime() },
    { id: 'vac_staff_nurse_01', title: 'Staff Nurse', company: 'Al Noor Medical City', location: 'Dubai branch', openings: 10, closingDate: '2027-01-31', createdAt: new Date('2026-10-21T10:00:00Z').getTime() },
    { id: 'vac_physio_01', title: 'Physiotherapist', company: 'al aberr', location: 'Jeddah branch', openings: 2, closingDate: '2027-01-10', createdAt: new Date('2026-10-06T10:00:00Z').getTime() }
  ];

  for (const item of items) {
    if (!titles.has(item.title.toLowerCase().trim())) {
      await p.$executeRawUnsafe(
        'INSERT INTO Vacancy (id, title, company, location, openings, details, imageKey, closingDate, postedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        item.id, item.title, item.company, item.location, item.openings, null, null, item.closingDate, 'acc_1c009cf414902dddf571c07f', item.createdAt
      );
      console.log('Added:', item.title);
    }
  }

  const all = await p.$queryRawUnsafe('SELECT count(*) as count FROM Vacancy');
  console.log('Total vacancies now:', all);
}

main().catch(console.error).finally(() => p.$disconnect());
