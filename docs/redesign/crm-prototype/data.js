// Mock data for GetMyPermit CRM v3 prototype
window.GMP_DATA = {
  org: { name: "Kancelaria GetMyPermit", motto: "Legalizacja pobytu cudzoziemców" },
  currentUser: { id: "U-01", name: "Anna Kowalska", initials: "AK", role: "Prawnik", roleKey: "lawyer" },

  staff: [
    { id: "U-01", name: "Anna Kowalska",       initials: "AK", role: "Prawnik",  roleKey: "lawyer",    casesActive: 38, onTime: 35, avgClose: 47, color: "#0d9488" },
    { id: "U-02", name: "Paweł Nowak",    initials: "PN", role: "Owner",    roleKey: "owner",     casesActive: 12, onTime: 12, avgClose: 41, color: "#7c3aed" },
    { id: "U-03", name: "Kasia Wiśniewska",initials: "KW", role: "Asystent", roleKey: "assistant", casesActive: 22, onTime: 19, avgClose: 38, color: "#e11d48" },
    { id: "U-04", name: "Marek Lewandowski",   initials: "ML", role: "Prawnik",  roleKey: "lawyer",    casesActive: 41, onTime: 36, avgClose: 52, color: "#0284c7" },
    { id: "U-05", name: "Tomasz Dąbrowski",initials: "TD", role: "Manager",  roleKey: "manager",   casesActive: 8,  onTime: 8,  avgClose: 33, color: "#d97706" },
    { id: "U-06", name: "Joanna Zielińska",initials: "JZ", role: "Asystent", roleKey: "assistant", casesActive: 19, onTime: 17, avgClose: 40, color: "#65a30d" },
  ],

  clients: [
    { id: "CL-1042", first: "Mariia",       last: "Petrenko",     nationality: "Ukraina",     flag: "🇦", born: "1992-03-14", profession: "Kucharka",    pesel: "92031412345", phone: "+48 600 123 456", email: "mariia.p@example.com",   cases: 2, lastSeen: "2026-04-29" },
    { id: "CL-1043", first: "Oleksandr",    last: "Kovalenko",    nationality: "Ukraina",     flag: "🇦", born: "1988-07-22", profession: "Kierowca C+E",pesel: "88072287654", phone: "+48 601 234 567", email: "o.kovalenko@example.com",cases: 3, lastSeen: "2026-04-30" },
    { id: "CL-1044", first: "Nguyen Van",   last: "An",           nationality: "Wietnam",     flag: "🇭", born: "1985-11-09", profession: "Restauracja", pesel: "85110909876", phone: "+48 602 345 678", email: "nv.an@example.com",     cases: 1, lastSeen: "2026-04-26" },
    { id: "CL-1045", first: "Aslan",        last: "Berdyev",      nationality: "Turkmenistan",flag: "🇩", born: "1990-02-28", profession: "IT",          pesel: "90022898765", phone: "+48 603 456 789", email: "aslan.b@example.com",   cases: 1, lastSeen: "2026-04-21" },
    { id: "CL-1046", first: "Davit",        last: "Sargsyan",     nationality: "Armenia",     flag: "🇩", born: "1995-06-10", profession: "Budowlaniec", pesel: "95061045678", phone: "+48 604 567 890", email: "d.sargsyan@example.com",cases: 1, lastSeen: "2026-04-30" },
    { id: "CL-1047", first: "Iryna",        last: "Bondarenko",   nationality: "Ukraina",     flag: "🇦", born: "1986-09-03", profession: "Pielęgniarka",pesel: "86090356789", phone: "+48 605 678 901", email: "iryna.b@example.com",   cases: 2, lastSeen: "2026-04-28" },
    { id: "CL-1048", first: "Mohammad",     last: "Nazari",       nationality: "Afganistan",  flag: "🇩", born: "1991-12-15", profession: "Magazynier",  pesel: "91121567890", phone: "+48 606 789 012", email: "m.nazari@example.com",  cases: 1, lastSeen: "2026-04-19" },
    { id: "CL-1049", first: "Lakshmi",      last: "Ramanan",      nationality: "Indie",       flag: "🇩", born: "1989-04-19", profession: "Software",    pesel: "89041967890", phone: "+48 607 890 123", email: "l.ramanan@example.com", cases: 2, lastSeen: "2026-04-30" },
    { id: "CL-1050", first: "Adebayo",      last: "Okafor",       nationality: "Nigeria",     flag: "🇩", born: "1994-08-07", profession: "Studia",      pesel: "94080778901", phone: "+48 608 901 234", email: "a.okafor@example.com",  cases: 1, lastSeen: "2026-04-15" },
    { id: "CL-1051", first: "Volodymyr",    last: "Shevchenko",   nationality: "Ukraina",     flag: "🇦", born: "1981-10-25", profession: "Spawacz",     pesel: "81102589012", phone: "+48 609 012 345", email: "v.shevchenko@example.com",cases: 4, lastSeen: "2026-04-30" },
    { id: "CL-1052", first: "Andrii",       last: "Tkachenko",    nationality: "Ukraina",     flag: "🇦", born: "1993-05-11", profession: "Logistyka",   pesel: "93051190123", phone: "+48 610 123 456", email: "a.tkachenko@example.com",cases: 1, lastSeen: "2026-04-29" },
    { id: "CL-1053", first: "Phan Thi",     last: "Lan",          nationality: "Wietnam",     flag: "🇭", born: "1990-01-03", profession: "Manicure",    pesel: "90010301234", phone: "+48 611 234 567", email: "p.lan@example.com",     cases: 1, lastSeen: "2026-04-23" },
  ],

  employers: [
    { id: "EM-01", name: "Polmlek Sp. z o.o.",            nip: "7011234567", branch: "Mleczarstwo",     workers: 8, lastInvoice: "2026-04-15", lastInvoiceAmount: 4800, contact: "Marek Wiśniewski",  city: "Grajewo",   legality: 7 },
    { id: "EM-02", name: "Castorama Polska Sp. z o.o.",   nip: "5252109856", branch: "Handel detaliczny", workers: 14, lastInvoice: "2026-04-22", lastInvoiceAmount: 9200, contact: "Joanna Lewicka",        city: "Warszawa",  legality: 13 },
    { id: "EM-03", name: "Małopolska Hodowla Roślin",nip: "6790015587", branch: "Rolnictwo",       workers: 5, lastInvoice: "2026-04-08", lastInvoiceAmount: 3000, contact: "Stanisław Król",city: "Kraków",legality: 4 },
    { id: "EM-04", name: "TransLogistics 24 Sp. z o.o.",  nip: "5213765432", branch: "Transport",         workers: 22, lastInvoice: "2026-04-28", lastInvoiceAmount: 14400,contact: "Robert Borowski",       city: "Poznań", legality: 19 },
    { id: "EM-05", name: "Atrium Hotel Kraków",      nip: "6762456789", branch: "Hotelarstwo",       workers: 9, lastInvoice: "2026-04-19", lastInvoiceAmount: 5400, contact: "Magdalena Adamczyk",    city: "Kraków",legality: 8 },
    { id: "EM-06", name: "BudMaster Wschód",         nip: "7392145678", branch: "Budownictwo",       workers: 31, lastInvoice: "2026-04-30", lastInvoiceAmount: 18600,contact: "Krzysztof Mazur",       city: "Lublin",    legality: 26 },
    { id: "EM-07", name: "Dolina Smaków Catering",   nip: "9512387654", branch: "Gastronomia",       workers: 6, lastInvoice: "2026-04-11", lastInvoiceAmount: 3600, contact: "Beata Sikorska",        city: "Wrocław",legality: 5 },
  ],

  cases: [
    { id: "GMP-2026-00184", clientId: "CL-1042", employerId: "EM-07", kind: "Pobyt czasowy + praca", status: "aktywna", stage: "po-osobistym", stageLabel: "Po osobistym", lawyerId: "U-01", assistantId: "U-03", opened: "2026-02-14", lastChange: "2026-04-30 13:20", priority: "medium", daysInStage: 12, paymentStatus: "klient-przekazal", appFee: 440, lawyerFee: 2400 },
    { id: "GMP-2026-00191", clientId: "CL-1043", employerId: "EM-04", kind: "Pobyt czasowy + praca", status: "aktywna", stage: "oczek-decyzji", stageLabel: "Oczek. decyzji", lawyerId: "U-04", assistantId: "U-06", opened: "2026-01-22", lastChange: "2026-04-29 16:42", priority: "low",    daysInStage: 67, paymentStatus: "oplacono",      appFee: 440, lawyerFee: 2200 },
    { id: "GMP-2026-00203", clientId: "CL-1044", employerId: "EM-07", kind: "Zezwolenie na pracę typ A", status: "aktywna", stage: "weryfikacja-dokumentow",stageLabel: "Weryfikacja dok.", lawyerId: "U-01", assistantId: "U-03", opened: "2026-03-08", lastChange: "2026-04-26 10:18", priority: "high",   daysInStage: 3,  paymentStatus: "do-oplaty",     appFee: 100, lawyerFee: 1500 },
    { id: "GMP-2026-00210", clientId: "CL-1045", employerId: "EM-02", kind: "Pobyt czasowy + praca", status: "aktywna", stage: "zlozenie-wniosku",      stageLabel: "Złożenie",  lawyerId: "U-04", assistantId: "U-06", opened: "2026-03-19", lastChange: "2026-04-25 09:14", priority: "medium", daysInStage: 8,  paymentStatus: "klient-przekazal", appFee: 440, lawyerFee: 2400 },
    { id: "GMP-2026-00218", clientId: "CL-1046", employerId: "EM-06", kind: "Zezwolenie na pracę typ A", status: "aktywna", stage: "osobiste",              stageLabel: "Osobiste", lawyerId: "U-01", assistantId: "U-03", opened: "2026-04-02", lastChange: "2026-04-30 15:00", priority: "high",   daysInStage: 2,  paymentStatus: "kancelaria-oplacila",appFee: 100, lawyerFee: 1500 },
    { id: "GMP-2026-00224", clientId: "CL-1047", employerId: "EM-05", kind: "Pobyt rezydenta UE",   status: "aktywna", stage: "oczek-decyzji",         stageLabel: "Oczek. decyzji", lawyerId: "U-04", assistantId: "U-06", opened: "2026-02-28", lastChange: "2026-04-28 11:04", priority: "medium", daysInStage: 41, paymentStatus: "oplacono",      appFee: 640, lawyerFee: 3200 },
    { id: "GMP-2026-00231", clientId: "CL-1048", employerId: "EM-06", kind: "Pobyt czasowy + praca", status: "aktywna", stage: "po-osobistym",          stageLabel: "Po osobistym", lawyerId: "U-01", assistantId: "U-03", opened: "2026-03-25", lastChange: "2026-04-19 09:00", priority: "low",    daysInStage: 25, paymentStatus: "oplacono",      appFee: 440, lawyerFee: 2400 },
    { id: "GMP-2026-00238", clientId: "CL-1049", employerId: "EM-04", kind: "Pobyt stały",     status: "aktywna", stage: "weryfikacja-dokumentow",stageLabel: "Weryfikacja dok.", lawyerId: "U-04", assistantId: "U-06", opened: "2026-04-15", lastChange: "2026-04-30 16:08", priority: "medium", daysInStage: 15, paymentStatus: "do-oplaty",     appFee: 640, lawyerFee: 3500 },
    { id: "GMP-2026-00244", clientId: "CL-1050", employerId: "EM-02", kind: "Zaproszenie",          status: "zlecona", stage: "weryfikacja-dokumentow",stageLabel: "Weryfikacja dok.", lawyerId: null,    assistantId: "U-03", opened: "2026-04-22", lastChange: "2026-04-15 14:32", priority: "low",    daysInStage: 1,  paymentStatus: "do-oplaty",     appFee: 27,  lawyerFee: 800 },
    { id: "GMP-2026-00250", clientId: "CL-1051", employerId: "EM-04", kind: "Pobyt czasowy + praca", status: "aktywna", stage: "zakonczenie",           stageLabel: "Zakończenie",lawyerId: "U-01", assistantId: "U-03", opened: "2026-01-05", lastChange: "2026-04-30 11:30", priority: "low",    daysInStage: 4,  paymentStatus: "oplacono",      appFee: 440, lawyerFee: 2200 },
    { id: "GMP-2026-00257", clientId: "CL-1052", employerId: "EM-04", kind: "Pobyt czasowy + praca", status: "aktywna", stage: "osobiste",              stageLabel: "Osobiste",      lawyerId: "U-04", assistantId: "U-06", opened: "2026-03-10", lastChange: "2026-04-29 14:00", priority: "medium", daysInStage: 7,  paymentStatus: "klient-przekazal", appFee: 440, lawyerFee: 2400 },
    { id: "GMP-2026-00263", clientId: "CL-1053", employerId: "EM-07", kind: "Pobyt czasowy + praca", status: "aktywna", stage: "odwolanie",             stageLabel: "Odwołanie", lawyerId: "U-02", assistantId: null, opened: "2026-02-08", lastChange: "2026-04-30 17:45", priority: "high",   daysInStage: 19, paymentStatus: "sporne",        appFee: 440, lawyerFee: 3800 },
    { id: "GMP-2026-00271", clientId: "CL-1042", employerId: "EM-07", kind: "Karta Polaka",         status: "lead",    stage: "weryfikacja-dokumentow",stageLabel: "Weryfikacja dok.", lawyerId: null,    assistantId: "U-06", opened: "2026-04-29", lastChange: "2026-04-29 10:11", priority: "low",    daysInStage: 1,  paymentStatus: "do-oplaty",     appFee: 0,   lawyerFee: 1200 },
    { id: "GMP-2026-00275", clientId: "CL-1051", employerId: "EM-04", kind: "Zezwolenie na pracę typ A", status: "aktywna", stage: "zlozenie-wniosku", stageLabel: "Złożenie", lawyerId: "U-01", assistantId: "U-03", opened: "2026-04-12", lastChange: "2026-04-30 09:45", priority: "medium", daysInStage: 5, paymentStatus: "kancelaria-oplacila", appFee: 100, lawyerFee: 1500 },
    { id: "GMP-2026-00280", clientId: "CL-1043", employerId: "EM-04", kind: "Odwołanie",       status: "aktywna", stage: "odwolanie",             stageLabel: "Odwołanie",lawyerId: "U-02", assistantId: null, opened: "2026-04-08", lastChange: "2026-04-28 13:14", priority: "high",   daysInStage: 22, paymentStatus: "klient-przekazal", appFee: 0, lawyerFee: 4000 },
  ],

  stages: [
    { key: "weryfikacja-dokumentow", label: "Weryfikacja dok.",   short: "Weryf." },
    { key: "zlozenie-wniosku",       label: "Złożenie",  short: "Złoż." },
    { key: "osobiste",               label: "Osobiste",            short: "Osob." },
    { key: "po-osobistym",           label: "Po osobistym",        short: "Po-os." },
    { key: "oczek-decyzji",          label: "Oczek. decyzji",      short: "Oczek." },
    { key: "zakonczenie",            label: "Zakończenie",    short: "Konc." },
    { key: "odwolanie",              label: "Odwołanie",      short: "Odwoł." },
  ],

  alerts: [
    { id: "AL-001", severity: "overdue", days: -8,  caseId: "GMP-2026-00184", title: "Brak ruchu w sprawie ponad tydzień", subject: "Mariia Petrenko",       message: "Ostatnia zmiana 8 dni temu. Etap „Po osobistym” wymaga odpowiedzi z urzędu.", action: "Otwórz" },
    { id: "AL-002", severity: "overdue", days: -3,  caseId: "GMP-2026-00203", title: "Płatność wniosku po terminie", subject: "Nguyen Van An", message: "Klient nie przekazał opłaty 100 PLN. Złożenie wniosku zablokowane.", action: "Wyślij ponaglenie" },
    { id: "AL-003", severity: "warn", days: 4,   caseId: "GMP-2026-00224", title: "Decyzja kończy się za 4 dni", subject: "Iryna Bondarenko",      message: "Termin decyzji w sprawie pobytu rezydenta UE — zaplanuj odbiór karty.", action: "Zaplanuj termin" },
    { id: "AL-004", severity: "warn", days: 7,   caseId: "GMP-2026-00231", title: "Spotkanie u klienta — 7 dni", subject: "Mohammad Nazari",   message: "Po osobistym, przygotuj zestaw dokumentów (paszport, zdjęcie biometryczne).", action: "Otwórz" },
    { id: "AL-005", severity: "info", days: 14,  caseId: "GMP-2026-00218", title: "Termin osobistego stawiennictwa", subject: "Davit Sargsyan",  message: "Spotkanie w UW Kraków 14 maja, godz. 10:30, sala 304.", action: "Otwórz" },
    { id: "AL-006", severity: "warn", days: 12,  caseId: "GMP-2026-00210", title: "Brak weryfikacji paszportu", subject: "Aslan Berdyev",       message: "Paszport wgrany, ale czeka na weryfikację prawnika już 12 dni.", action: "Zweryfikuj" },
    { id: "AL-007", severity: "overdue", days: -19, caseId: "GMP-2026-00263", title: "Termin składania odwołania upłynął", subject: "Phan Thi Lan", message: "Odwołanie wymagało złożenia 19 dni temu — sprawdź uzasadnienie.", action: "Pilne" },
  ],

  activity: [
    { time: "13:20", text: "Złożono wniosek elektronicznie",            subject: "GMP-2026-00184 · Mariia Petrenko",      icon: "file-arrow-up", tone: "ok" },
    { time: "12:48", text: "Klient przekazał opłatę wniosku 440 PLN", subject: "GMP-2026-00210 · Aslan Berdyev",         icon: "currency-circle-dollar", tone: "ok" },
    { time: "11:14", text: "UPO odebrane",                                          subject: "GMP-2026-00191 · Oleksandr Kovalenko",   icon: "envelope-open", tone: "ok" },
    { time: "10:18", text: "Wgrano paszport (skan)",                                subject: "GMP-2026-00203 · Nguyen Van An",         icon: "file-text",  tone: "info" },
    { time: "09:45", text: "Zmieniono etap na „Złożenie wniosku”", subject: "GMP-2026-00275 · Volodymyr Shevchenko", icon: "arrow-right", tone: "info" },
    { time: "09:00", text: "System wykrył brak ruchu (8 dni)",                 subject: "GMP-2026-00184 · Mariia Petrenko",      icon: "warning-octagon", tone: "danger" },
    { time: "08:30", text: "Anna Kowalska zalogowała się",                subject: "Sesja 2FA",                                  icon: "sign-in", tone: "neutral" },
  ],

  documents: [
    { id: "DOC-501", caseId: "GMP-2026-00184", type: "Paszport", uploaded: "2026-02-14", status: "ok", size: "2.4 MB" },
    { id: "DOC-502", caseId: "GMP-2026-00184", type: "Załącznik nr 1 (zezwolenie)", uploaded: "2026-02-15", status: "ok", size: "486 KB" },
    { id: "DOC-503", caseId: "GMP-2026-00184", type: "Umowa o pracę", uploaded: "2026-02-15", status: "ok", size: "1.1 MB" },
    { id: "DOC-504", caseId: "GMP-2026-00184", type: "Zaświadczenie z ZUS", uploaded: "2026-02-20", status: "ok", size: "320 KB" },
    { id: "DOC-505", caseId: "GMP-2026-00184", type: "Zdjęcie biometryczne", uploaded: null, status: "missing", size: null },
    { id: "DOC-506", caseId: "GMP-2026-00184", type: "PIT-37 za 2025", uploaded: "2026-03-10", status: "warning", size: "780 KB" },
  ],

  tasks: [
    { id: "T-01", title: "Zadzwonić do klienta — Mariia Petrenko", caseId: "GMP-2026-00184", assigneeId: "U-01", deadline: "2026-05-01", status: "todo", priority: "high" },
    { id: "T-02", title: "Wgrać zdjęcie biometryczne",         caseId: "GMP-2026-00184", assigneeId: "U-03", deadline: "2026-05-01", status: "todo", priority: "high" },
    { id: "T-03", title: "Odebrać UPO z UW",                        caseId: "GMP-2026-00191", assigneeId: "U-04", deadline: "2026-05-01", status: "doing", priority: "medium" },
    { id: "T-04", title: "Przygotować pełnomocnictwo",         caseId: "GMP-2026-00263", assigneeId: "U-02", deadline: "2026-05-02", status: "todo", priority: "high" },
    { id: "T-05", title: "Wysłać ponaglenie do klienta",       caseId: "GMP-2026-00203", assigneeId: "U-01", deadline: "2026-05-02", status: "todo", priority: "medium" },
    { id: "T-06", title: "Spotkanie z klientem (Davit)",                  caseId: "GMP-2026-00218", assigneeId: "U-01", deadline: "2026-05-05", status: "todo", priority: "medium" },
    { id: "T-07", title: "Złożyć wniosek elektronicznie",  caseId: "GMP-2026-00210", assigneeId: "U-04", deadline: "2026-05-06", status: "todo", priority: "medium" },
    { id: "T-08", title: "Wystawić fakturę dla EM-04",          caseId: "GMP-2026-00257", assigneeId: "U-05", deadline: "2026-04-28", status: "todo", priority: "low" },
    { id: "T-09", title: "Zweryfikować tłumaczenie",            caseId: "GMP-2026-00231", assigneeId: "U-03", deadline: "2026-04-25", status: "todo", priority: "low" },
  ],

  appointments: [
    { id: "AP-01", date: "2026-05-05", time: "10:30", caseId: "GMP-2026-00218", clientId: "CL-1046", kind: "Osobiste stawiennictwo",   place: "MUW Kraków, sala 304", staffId: "U-01" },
    { id: "AP-02", date: "2026-05-06", time: "12:00", caseId: "GMP-2026-00210", clientId: "CL-1045", kind: "Złożenie wniosku",place: "UW Warszawa",              staffId: "U-04" },
    { id: "AP-03", date: "2026-05-07", time: "09:00", caseId: "GMP-2026-00184", clientId: "CL-1042", kind: "Konsultacja (po osobistym)",place: "Biuro kancelarii",         staffId: "U-01" },
    { id: "AP-04", date: "2026-05-08", time: "14:00", caseId: "GMP-2026-00263", clientId: "CL-1053", kind: "Konsultacja odwoławcza",place: "Online (Meet)",            staffId: "U-02" },
    { id: "AP-05", date: "2026-05-12", time: "11:00", caseId: "GMP-2026-00224", clientId: "CL-1047", kind: "Odbiór karty",          place: "MUW Warszawa",             staffId: "U-04" },
  ],

  payments: [
    { id: "PM-01", date: "2026-04-30", caseId: "GMP-2026-00210", clientName: "Aslan Berdyev",       kind: "wniosek",     amount: 440,  status: "klient-przekazal" },
    { id: "PM-02", date: "2026-04-29", caseId: "GMP-2026-00184", clientName: "Mariia Petrenko",     kind: "honorarium",  amount: 2400, status: "oplacono" },
    { id: "PM-03", date: "2026-04-28", caseId: "GMP-2026-00191", clientName: "Oleksandr Kovalenko", kind: "wniosek",     amount: 440,  status: "kancelaria-oplacila" },
    { id: "PM-04", date: "2026-04-27", caseId: "GMP-2026-00224", clientName: "Iryna Bondarenko",    kind: "honorarium",  amount: 3200, status: "oplacono" },
    { id: "PM-05", date: "2026-04-26", caseId: "GMP-2026-00203", clientName: "Nguyen Van An",       kind: "wniosek",     amount: 100,  status: "do-oplaty" },
    { id: "PM-06", date: "2026-04-25", caseId: "GMP-2026-00218", clientName: "Davit Sargsyan",      kind: "karta",       amount: 50,   status: "kancelaria-oplacila" },
    { id: "PM-07", date: "2026-04-22", caseId: "GMP-2026-00263", clientName: "Phan Thi Lan",        kind: "honorarium",  amount: 3800, status: "sporne" },
    { id: "PM-08", date: "2026-04-20", caseId: "GMP-2026-00231", clientName: "Mohammad Nazari",     kind: "wniosek",     amount: 440,  status: "oplacono" },
    { id: "PM-09", date: "2026-04-18", caseId: "GMP-2026-00250", clientName: "Volodymyr Shevchenko",kind: "karta",       amount: 50,   status: "oplacono" },
    { id: "PM-10", date: "2026-04-15", caseId: "GMP-2026-00238", clientName: "Lakshmi Ramanan",     kind: "wniosek",     amount: 640,  status: "do-oplaty" },
  ],

  receivables: [
    { id: "RC-01", caseId: "GMP-2026-00203", clientName: "Nguyen Van An",       amount: 100,  daysOverdue: 8,  bucket: "30" },
    { id: "RC-02", caseId: "GMP-2026-00238", clientName: "Lakshmi Ramanan",     amount: 640,  daysOverdue: 12, bucket: "30" },
    { id: "RC-03", caseId: "GMP-2026-00263", clientName: "Phan Thi Lan",        amount: 3800, daysOverdue: 38, bucket: "60" },
    { id: "RC-04", caseId: "GMP-2026-00244", clientName: "Adebayo Okafor",      amount: 800,  daysOverdue: 75, bucket: "90" },
    { id: "RC-05", caseId: "GMP-2026-00271", clientName: "Mariia Petrenko",     amount: 1200, daysOverdue: 102,bucket: "90+" },
  ],

  invoices: [
    { id: "FV/2026/04/0142", date: "2026-04-30", recipient: "TransLogistics 24 Sp. z o.o.", recipientNip: "5213765432", net: 7500,  vat: 1725, gross: 9225,  status: "wystawiona" },
    { id: "FV/2026/04/0141", date: "2026-04-28", recipient: "BudMaster Wschód",        recipientNip: "7392145678", net: 14000, vat: 3220, gross: 17220, status: "oplacona" },
    { id: "FV/2026/04/0140", date: "2026-04-22", recipient: "Castorama Polska Sp. z o.o.",  recipientNip: "5252109856", net: 7480,  vat: 1720, gross: 9200,  status: "oplacona" },
    { id: "FV/2026/04/0139", date: "2026-04-19", recipient: "Atrium Hotel Kraków",     recipientNip: "6762456789", net: 4390,  vat: 1010, gross: 5400,  status: "wystawiona" },
    { id: "FV/2026/04/0138", date: "2026-04-15", recipient: "Polmlek Sp. z o.o.",           recipientNip: "7011234567", net: 3902,  vat: 898,  gross: 4800,  status: "oplacona" },
    { id: "FV/2026/04/0137", date: "2026-04-11", recipient: "Dolina Smaków Catering",  recipientNip: "9512387654", net: 2927,  vat: 673,  gross: 3600,  status: "wysłana" },
  ],

  leads: [
    { id: "LD-01", first: "Andrzej",   last: "Kowalski (HR)",    company: "Polmlek",          email: "andrzej@polmlek.pl",       phone: "+48 600 111 222", source: "Polecenie",  noted: "2026-04-29", interest: "5 cudzoziemców" },
    { id: "LD-02", first: "Beata",     last: "Nowicka (HR)",     company: "Castorama",        email: "beata@castorama.pl",       phone: "+48 600 222 333", source: "LinkedIn",   noted: "2026-04-28", interest: "Pakiet biznesowy" },
    { id: "LD-03", first: "Cezary",    last: "Lis (CEO)",        company: "BudMaster",        email: "cezary@budmaster.pl",      phone: "+48 600 333 444", source: "Strona WWW", noted: "2026-04-26", interest: "12 spraw" },
    { id: "LD-04", first: "Dorota",    last: "Woźniak",     company: "TransLogistics 24",email: "dorota@translog24.pl",    phone: "+48 600 444 555", source: "Cold call",  noted: "2026-04-22", interest: "Konsultacja" },
    { id: "LD-05", first: "Edward",    last: "Kamiński",    company: "Atrium Hotel",     email: "edward@atriumkrk.pl",      phone: "+48 600 555 666", source: "Polecenie",  noted: "2026-04-21", interest: "3 sprawy" },
    { id: "LD-06", first: "Filip",     last: "Mazurek",          company: "—",                email: "filip.mazurek@example.com",phone: "+48 600 666 777", source: "Strona WWW", noted: "2026-04-19", interest: "Karta Polaka" },
  ],

  legality: [
    { employerId: "EM-04", workerName: "Volodymyr Shevchenko", residenceUntil: "2027-04-12", workUntil: "2027-04-12", status: "ok" },
    { employerId: "EM-04", workerName: "Andrii Tkachenko",      residenceUntil: "2026-08-30", workUntil: "2026-08-30", status: "ok" },
    { employerId: "EM-04", workerName: "Oleksandr Kovalenko",   residenceUntil: "2026-06-22", workUntil: "2026-06-22", status: "warn" },
    { employerId: "EM-06", workerName: "Davit Sargsyan",        residenceUntil: "2027-11-04", workUntil: "2027-11-04", status: "ok" },
    { employerId: "EM-06", workerName: "Mohammad Nazari",       residenceUntil: "2026-05-30", workUntil: "2026-05-30", status: "warn" },
    { employerId: "EM-07", workerName: "Mariia Petrenko",       residenceUntil: "2026-04-15", workUntil: "2026-04-15", status: "danger" },
    { employerId: "EM-07", workerName: "Phan Thi Lan",          residenceUntil: "2026-09-30", workUntil: "2026-09-30", status: "ok" },
    { employerId: "EM-07", workerName: "Nguyen Van An",         residenceUntil: "2026-08-30", workUntil: "2026-08-30", status: "ok" },
  ],
};

// helpers exposed for components
window.GMP_HELPERS = {
  fmtPLN: (n) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0 }).format(n),
  byId: (arr, id) => arr.find(x => x.id === id),
  staffById: (id) => window.GMP_DATA.staff.find(s => s.id === id),
  clientById: (id) => window.GMP_DATA.clients.find(c => c.id === id),
  employerById: (id) => window.GMP_DATA.employers.find(e => e.id === id),
  caseById: (id) => window.GMP_DATA.cases.find(c => c.id === id),
  stageLabel: (key) => (window.GMP_DATA.stages.find(s => s.key === key) || {}).label || key,
  paymentLabel: (k) => ({ "do-oplaty":"Do opłaty","klient-przekazal":"Klient przekazał","kancelaria-oplacila":"Kancelaria opłaciła","oplacono":"Opłacono","sporne":"Sporne" }[k] || k),
  paymentKind: (k) => ({ "do-oplaty":"warn","klient-przekazal":"info","kancelaria-oplacila":"accent","oplacono":"ok","sporne":"danger" }[k] || "gray"),
  priorityKind: (p) => ({ low: "gray", medium: "warn", high: "danger" }[p] || "gray"),
  priorityLabel: (p) => ({ low: "Niski", medium: "Średni", high: "Wysoki" }[p] || p),
};
