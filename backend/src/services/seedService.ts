import Anthropic from "@anthropic-ai/sdk";
import { insertTransaction, getTransactionCount } from "../db/queries";
import { v4 as uuidv4 } from "uuid";

const client = new Anthropic();

type RawTransaction = {
  customerName: string;
  amount: number;
  currency: string;
  region: string;
  salesRep: string;
  date: string;
};

export async function seedIfEmpty() {
  const { count } = getTransactionCount();
  if (count > 0) return;

  console.log("DB empty. Seeding data via Claude...");

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Generate 50 realistic B2B sales transactions. 
Return ONLY a valid JSON array. No explanation. No markdown.

Rules:
- Sales reps: Sarah Johnson, John Smith, Mike Chen, Emily Davis, Carlos Rivera
- Regions: North, South, East, West, Central
- Each rep works mostly in 1-2 regions consistently
- Amounts range from $2000 to $150000
- Currencies: mostly USD, some EUR and GBP
- Dates between 2024-01-01 and 2024-12-31
- Customer names should be realistic company names

Return this exact structure:
[
  {
    "customerName": "Acme Corp",
    "amount": 25000,
    "currency": "USD",
    "region": "West",
    "salesRep": "Sarah Johnson",
    "date": "2024-03-15"
  }
]`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed: RawTransaction[] = JSON.parse(clean);

  for (const tx of parsed) {
    insertTransaction({
      id: uuidv4(),
      customerName: tx.customerName,
      amount: tx.amount,
      currency: tx.currency,
      region: tx.region,
      salesRep: tx.salesRep,
      date: tx.date,
    });
  }

  console.log(`Seeded ${parsed.length} transactions.`);
}