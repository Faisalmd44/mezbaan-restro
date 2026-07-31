const { MongoClient } = require("mongodb");
const { createClient } = require("@supabase/supabase-js");

const MONGO_URI =
  "mongodb+srv://mezban:FAisalsaifi099@mezbaan.uvbyhhf.mongodb.net/?retryWrites=true&w=majority&appName=Mezbaan";

const SUPABASE_URL =
  "https://jppuqbujxtmemusmbgnv.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcHVxYnVqeHRtZW11c21iZ252Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDYyNTI3MSwiZXhwIjoyMTAwMjAxMjcxfQ.uhbr3t4I_Yvfed7OPEXuD5n-66Jw0zAwte6j8j6sab4";

async function main() {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();

  const db = mongo.db("Mezbaan");
  const menu = db.collection("menu");

  const items = await menu.find({}).toArray();
  console.log(`Found ${items.length} menu items`);

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  for (const item of items) {
    const row = {
      name: item.name,
      description: item.description || "",
      price: Number(item.price || 0),
      category: item.category || "Main",
      image: item.image || "",
      in_stock: item.in_stock ?? true,
      is_veg: item.veg ?? false,
      is_bestseller: item.popular ?? false,
      rating: 4.5,
      prep_time: 20,
      variants: item.variants || []
    };

    const { error } = await supabase
      .from("menu_items")
      .insert(row);

    if (error) {
      console.log("ERROR:", item.name, error.message);
    } else {
      console.log("Imported:", item.name);
    }
  }

  await mongo.close();
  console.log("Done.");
}

main().catch(console.error);
