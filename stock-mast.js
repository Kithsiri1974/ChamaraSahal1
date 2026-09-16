const express = require("express");
const path = require("path");
const postgres = require("postgres");

const app = express();
const PORT = process.env.PORT || 3000;

// Neon Connection String
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_GaeXmTBuw2v3@ep-square-queen-aeogdrnx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(connectionString);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Primary sidebar categories mapping
const SIDEBAR_CATEGORIES = [
  { id: "soft-drinks", name: "Soft Drinks", type: "Soft", icon: "🥤" },
  { id: "bar-items", name: "Bar Item", type: "Bar", icon: "🍸" },
  { id: "kitchen-items", name: "Kitchen Items", type: "Kic", icon: "🍳" },
];

app.get("/api/categories", (req, res) => {
  res.json(SIDEBAR_CATEGORIES);
});

// Stock Items API Endpoint returning items with grouped size variations
app.get("/api/stock-mast", async (req, res) => {
  try {
    let { item_type } = req.query;

    // Map frontend category tabs to database item_type values
    if (item_type) {
      const trimmedType = String(item_type).trim().toLowerCase();
      if (trimmedType === 'cha' || trimmedType === 'chamara') {
        item_type = 'CHA';
      } else if (trimmedType === 'jayaweera') {
        item_type = 'Jayaweera';
      } else if (trimmedType === 'sajith') {
        item_type = 'Sajith';
      } else if (trimmedType === 'tharushi') {
        item_type = 'Tharushi';
      } else if (trimmedType === 'thissamaharama') {
        item_type = 'Thissamaharama';
      }
    }

    let rows;
    if (item_type) {
      rows = await sql`
        SELECT * FROM stock_mast 
        WHERE LOWER(TRIM(item_type)) = LOWER(${item_type})
        ORDER BY LOWER(TRIM(it_desc)) ASC
      `;
    } else {
      rows = await sql`
        SELECT * FROM stock_mast 
        ORDER BY LOWER(TRIM(it_desc)) ASC
      `;
    }

    // Group variations properly
    const groupedMap = new Map();

    rows.forEach((row) => {
      const name = String(row.it_desc || row.IT_DESC || "Unknown").trim();
      const cat = String(row.item_cat || row.ITEM_CAT || "General").trim();
      const pic = String(row.pic_link || row.PIC_LINK || "").trim();
      const type = String(row.item_type || row.ITEM_TYPE || "").trim();
      
      // Read stock_in_hnd safely from column
      const rawStock = row.stock_in_hnd ?? row.STOCK_IN_HND ?? 0;
      const stockVal = parseFloat(rawStock) || 0;

      // Handle item_size falling back to unit or 'STD'
      const rawSize = String(row.item_size || row.ITEM_SIZE || row.it_unit || row.IT_UNIT || "STD").trim();
      const sizeDisplay = rawSize !== "" ? rawSize : "STD";

      const variation = {
        it_code: String(row.it_code || row.IT_CODE || name).trim(),
        item_size: sizeDisplay,
        price: parseFloat(row.it_uprise_sal || row.price || 0) || 0,
        stock_in_hnd: stockVal,
        stock: stockVal
      };

      if (!groupedMap.has(name)) {
        groupedMap.set(name, {
          item_name: name,
          item_cat: cat,
          pic_link: pic,
          item_type: type,
          stock_in_hnd: stockVal,
          variations: [variation]
        });
      } else {
        const existingItem = groupedMap.get(name);
        existingItem.variations.push(variation);
        // Keep the max stock for the primary display
        existingItem.stock_in_hnd = Math.max(existingItem.stock_in_hnd, stockVal);
      }
    });

    const result = Array.from(groupedMap.values());
    console.log(`[API /api/stock-mast] Returning ${result.length} items.`);
    res.json(result);

  } catch (error) {
    console.error("================ DATABASE ERROR ================");
    console.error(error.message);
    console.error("================================================");

    res.status(500).json({
      error: "Database Query Error",
      message: error.message,
    });
  }
});

// Fallback for SPA Routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//app.listen(PORT, () => {
//  console.log(`Server running at http://localhost:${PORT}`);
//});
