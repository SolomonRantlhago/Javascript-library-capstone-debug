import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve your HTML/CSS/JS files
app.use(express.static("."));
app.use(express.json());

// Save endpoint — overwrites Data.txt
app.post("/save", (req, res) => {
    try {
        const folder = path.join(__dirname, "LibraryData");

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        fs.writeFileSync(
            path.join(folder, "Data.txt"),
            JSON.stringify(req.body, null, 2),
            "utf-8"
        );

        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));