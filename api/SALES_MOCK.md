# Sales mock mode

Mock mode is opt-in and intended for local development only. The default remains fail closed.

1. Apply the Prisma migration to a disposable PostgreSQL database: `npx prisma migrate dev`.
2. Set `SALES_MOCK_MODE=true` in `.env`.
3. Start the API with `npm run start:dev`.

Use these IDs on every request:

- Shop: `10000000-0000-4000-8000-000000000001`
- Staff (`x-staff-id`): `20000000-0000-4000-8000-000000000001`

Products:

| Product | ID | Barcode | Price | Starting stock |
| --- | --- | --- | ---: | ---: |
| Americano | `30000000-0000-4000-8000-000000000001` | `8850000000011` | 60.00 | 20 |
| Cafe Latte | `30000000-0000-4000-8000-000000000002` | `8850000000028` | 75.00 | 15 |
| Butter Croissant | `30000000-0000-4000-8000-000000000003` | `8850000000035` | 55.00 | 10 |

Example flow:

```powershell
$shop = '10000000-0000-4000-8000-000000000001'
$headers = @{ 'x-staff-id' = '20000000-0000-4000-8000-000000000001' }

Invoke-RestMethod -Method Post -Uri "http://localhost:8000/shops/$shop/sales/scan" -Headers $headers -ContentType 'application/json' -Body '{"barcode":"8850000000011"}'

$sale = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/shops/$shop/sales" -Headers $headers -ContentType 'application/json' -Body '{"items":[{"shopProductId":"30000000-0000-4000-8000-000000000001","quantity":2},{"shopProductId":"30000000-0000-4000-8000-000000000003","quantity":1}],"note":"mock order"}'

Invoke-RestMethod -Method Get -Uri "http://localhost:8000/shops/$shop/sales" -Headers $headers
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/shops/$shop/sales/$($sale.id)" -Headers $headers
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/shops/$shop/sales/$($sale.id)/void" -Headers $headers -ContentType 'application/json' -Body '{"reason":"mock cancellation"}'
```

Inventory is in memory and resets whenever the API restarts. Sale records and stock movements are stored in PostgreSQL.
