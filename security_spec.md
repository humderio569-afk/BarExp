# Firestore Security Specification

## 1. Data Invariants

1. **Products**: Every product document must have a valid non-empty `id`, `name`, `category`, positive or zero `price`, and valid numeric `stock`.
2. **Sales**: Sales receipts must include receipt number, non-negative `total`, valid `paymentMethod`, cashier identifier, and creation `timestamp`.
3. **Expenses**: Every expense must feature a valid category, description, positive `amount`, date string, and valid `paymentMethod`.
4. **Tabs**: Active bar tabs require a valid `tableName`, array of cart items, and valid status ('open' or 'paid').
5. **Stock Logs**: Inventory audit entries must reference a valid `productId` and specify valid numeric quantity adjustments.
6. **Settings**: Bar settings document requires `barName`, `currency`, and `cashierName`.

## 2. The "Dirty Dozen" Threat Payloads

1. **Unauthenticated Write**: Attacker attempts to write or delete a product document without authentication.
2. **Negative Price Injection**: Attacker sends product payload with `price: -100`.
3. **Negative Stock Injection**: Attacker sends stock log with `quantity: "invalid_string"`.
4. **Invalid Payment Method**: Attacker creates a sale with `paymentMethod: "HackedPayment"`.
5. **Id Poisoning**: Attacker passes a 2000-character malicious string as `productId`.
6. **Ghost Field Mutation**: Attacker attempts to inject `isAdmin: true` into a settings document update.
7. **Date Spoofing**: Attacker creates an expense with an empty date.
8. **Negative Sale Total**: Attacker posts a sale document with `total: -5000`.
9. **Tab Hijack**: Attacker updates tab status to an unapproved state string `status: "deleted_hacked"`.
10. **Malicious Image Injection**: Attacker sends 5MB base64 string in product description.
11. **Excessive Field Flooding**: Attacker sends 500 extra properties on a product write.
12. **Blank Receipt Number**: Attacker inserts sale without `receiptNumber`.

## 3. Test Runner Specification (`firestore.rules.test.ts`)

All 12 threat scenarios must evaluate to `PERMISSION_DENIED` under strict Firestore Security Rules.
