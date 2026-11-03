import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isVercel = Boolean(process.env.VERCEL);

app.use(express.json());

// Local only: on Vercel, files in public/ are served by the CDN
// (express.static is ignored there).
if (!isVercel) {
    app.use(express.static(path.join(__dirname, "public")));
}

// Save endpoint — overwrites public/LibraryData/Data.txt (local development only)
app.post("/save", (req, res) => {
    // Vercel's filesystem is read-only, so saving to a file cannot work there.
    if (isVercel) {
        return res.status(501).json({
            error: "Saving to Data.txt is only available when running locally."
        });
    }

    try {
        const folder = path.join(__dirname, "public", "LibraryData");

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

// Vercel imports the exported app; locally we start our own listener.
if (!isVercel) {
    app.listen(3000, () => console.log("Server running at http://localhost:3000"));
}

export default app;
