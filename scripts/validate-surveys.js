import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const surveysDir = path.join(rootDir, "public", "surveys");
const issueTemplateDir = path.join(rootDir, ".github", "ISSUE_TEMPLATE");
const indexPath = path.join(surveysDir, "index.json");

const supportedTypes = new Set(["input", "textarea", "email", "date", "rating", "select", "radio", "checkbox"]);
const optionTypes = new Set(["select", "radio", "checkbox"]);

const fail = (message) => {
  throw new Error(message);
};

const ensureString = (value, message) => {
  if (typeof value !== "string" || !value.trim()) {
    fail(message);
  }
};

const validateField = (field, index) => {
  if (!field || typeof field !== "object") {
    fail(`Field at index ${index} must be an object`);
  }

  ensureString(field.name, `Field at index ${index} requires name`);
  ensureString(field.label, `Field ${field.name} requires label`);
  ensureString(field.type, `Field ${field.name} requires type`);

  if (!supportedTypes.has(field.type)) {
    fail(`Field ${field.name} uses unsupported type ${field.type}`);
  }

  if (optionTypes.has(field.type)) {
    if (!Array.isArray(field.options) || field.options.length === 0) {
      fail(`Field ${field.name} requires non-empty options`);
    }

    field.options.forEach((option, optionIndex) => {
      ensureString(option?.value, `Field ${field.name} option ${optionIndex} requires value`);
      ensureString(option?.label, `Field ${field.name} option ${optionIndex} requires label`);
    });
  }

  if (field.type === "rating") {
    const min = Number.isInteger(field.scaleMin) ? field.scaleMin : 1;
    const max = Number.isInteger(field.scaleMax) ? field.scaleMax : 5;
    if (min >= max) {
      fail(`Field ${field.name} requires scaleMin < scaleMax`);
    }
  }
};

const run = async () => {
  const indexSource = await fs.readFile(indexPath, "utf8");
  const indexJson = JSON.parse(indexSource);
  const files = Array.isArray(indexJson.files) ? indexJson.files : fail("public/surveys/index.json requires files array");

  for (const fileName of files) {
    ensureString(fileName, "Survey index contains invalid file name");
    const surveyPath = path.join(surveysDir, fileName);
    const source = await fs.readFile(surveyPath, "utf8");
    const survey = JSON.parse(source);

    ensureString(survey.id, `${fileName} requires survey.id`);
    ensureString(survey.issueTemplate, `${fileName} requires issueTemplate`);
    ensureString(survey.title, `${fileName} requires title`);
    if (!Array.isArray(survey.fields) || survey.fields.length === 0) {
      fail(`${fileName} requires non-empty fields array`);
    }

    const templatePath = path.join(issueTemplateDir, survey.issueTemplate);
    await fs.access(templatePath);

    survey.fields.forEach(validateField);
  }

  console.log(`Validated ${files.length} survey configuration files successfully.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});