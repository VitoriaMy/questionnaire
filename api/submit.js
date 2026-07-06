import { Octokit } from "@octokit/core";

const REQUIRED_ENV_VARS = ["GH_TOKEN", "GH_OWNER", "GH_DATA_REPO"];

const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  return fn(req, res);
};

const parseRequestBody = (body) => {
  if (body == null) {
    return null;
  }

  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed ? JSON.parse(trimmed) : null;
  }

  return body;
};

const isEmptyObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return true;
  }

  return Object.keys(value).length === 0;
};

const getMissingEnvVars = () =>
  REQUIRED_ENV_VARS.filter((key) => !process.env[key] || !process.env[key].trim());

const handler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const formData = parseRequestBody(req.body);

    if (isEmptyObject(formData)) {
      return res
        .status(400)
        .json({ success: false, message: "Data submission cannot be empty" });
    }

    const missingEnvVars = getMissingEnvVars();
    if (missingEnvVars.length > 0) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error: Missing Environment Variables",
        missing: missingEnvVars,
      });
    }

    const octokit = new Octokit({ auth: process.env.GH_TOKEN });
    const fileName = `data-${Date.now()}.json`;
    const payload = {
      ...formData,
      submittedAt: new Date().toISOString(),
    };
    const contentBase64 = Buffer.from(JSON.stringify(payload, null, 2)).toString("base64");

    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: process.env.GH_OWNER,
      repo: process.env.GH_DATA_REPO,
      path: `responses/${fileName}`,
      message: `Form submission ${fileName}`,
      content: contentBase64,
    });

    return res.status(200).json({ success: true, message: "Submission successful" });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ success: false, message: "Invalid JSON payload" });
    }

    const message = error instanceof Error ? error.message : "Unknown server error";
    return res.status(500).json({ success: false, error: message });
  }
};

export default allowCors(handler);