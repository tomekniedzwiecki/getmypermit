"""Diagnostyka platnosci - czy daty i kwoty sa dobrze zaimportowane"""
import os, requests
from pathlib import Path
from dotenv import load_dotenv
from collections import Counter, defaultdict
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

def fetch_all(table, select='*', extra=''):
    out, f = [], 0
    while True:
        qs = f"select={select}"
        if extra: qs += '&' + extra
        r = requests.get(f"{URL}/rest/v1/{table}?{qs}", headers={**H, "Range-Unit": "items", "Range": f"{f}-{f+999}"})
        rows = r.json()
        out.extend(rows)
        if len(rows) < 1000: break
        f += 1000
    return out

print("=== 1. Rozklad payment_date ===")
payments = fetch_all('gmp_payments', 'id,amount,payment_date,method,kind,case_id')
print(f"   Razem: {len(payments)}")

null_date = sum(1 for p in payments if not p['payment_date'])
print(f"   Bez daty: {null_date}")

with_date = [p for p in payments if p['payment_date']]
print(f"   Z data:  {len(with_date)}")

# Rok-miesiac
by_ym = Counter(p['payment_date'][:7] for p in with_date)
print(f"\n   Top 20 miesiecy:")
for ym, n in sorted(by_ym.items()):
    total = sum(float(p['amount'] or 0) for p in with_date if p['payment_date'].startswith(ym))
    print(f"     {ym}: {n:4d} wpłat, suma: {total:>12,.0f} PLN")

print(f"\n=== 2. Dystrybucja kwot ===")
amounts = [float(p['amount'] or 0) for p in payments]
print(f"   Suma: {sum(amounts):,.0f} PLN")
print(f"   Min:  {min(amounts) if amounts else 0}")
print(f"   Max:  {max(amounts) if amounts else 0}")
print(f"   Avg:  {sum(amounts)/len(amounts) if amounts else 0:.0f}")

print(f"\n=== 3. Przyklady plantosci z 2023-12 ===")
samples = [p for p in with_date if p['payment_date'].startswith('2023-12')][:5]
for p in samples:
    print(f"   {p['payment_date']} | {p['amount']} | {p.get('method', '')} | {p.get('kind', '')}")

print(f"\n=== 4. Spraw vs wynagr ===")
cases = fetch_all('gmp_cases', 'id,fee_amount,category')
total_fee = sum(float(c['fee_amount'] or 0) for c in cases if c['fee_amount'])
print(f"   Suma fee_amount w cases: {total_fee:,.0f} PLN (ile kancelaria ZAROBILA NA ZLECENIACH)")
print(f"   Suma amount w payments:  {sum(amounts):,.0f} PLN (ile kancelaria OTRZYMALA WPLAT)")

print(f"\n=== 5. Per kategoria ===")
by_cat = defaultdict(lambda: {'count': 0, 'total_fee': 0})
for c in cases:
    cat = c.get('category') or 'none'
    by_cat[cat]['count'] += 1
    by_cat[cat]['total_fee'] += float(c['fee_amount'] or 0)
for cat, stats in sorted(by_cat.items(), key=lambda x: -x[1]['total_fee']):
    avg = stats['total_fee'] / stats['count'] if stats['count'] else 0
    print(f"   {cat:30s} {stats['count']:5d} spraw  suma fee: {stats['total_fee']:>12,.0f} PLN  avg: {avg:>6,.0f}")

print(f"\n=== 6. Ile miesiecy ma dane ===")
years = Counter(ym[:4] for ym in by_ym.keys())
for y, n in sorted(years.items()):
    total_y = sum(float(p['amount'] or 0) for p in with_date if p['payment_date'].startswith(y))
    print(f"   {y}: {n} miesiecy z danymi, suma: {total_y:>12,.0f} PLN")
