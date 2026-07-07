import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const surveysDir = path.join(rootDir, "public", "surveys");
const issueTemplateDir = path.join(rootDir, ".github", "ISSUE_TEMPLATE");
const indexPath = path.join(surveysDir, "index.json");
const configPath = path.join(issueTemplateDir, "config.yml");

const toIssueId = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const toYamlScalar = (value) => `"${String(value).replace(/"/g, '\\"')}"`;

const pushIndented = (lines, indentLevel, line) => {
  lines.push(`${"  ".repeat(indentLevel)}${line}`);
};

const createFieldBlock = (field) => {
  const id = toIssueId(field.name);
  const required = field.required !== false ? "true" : "false";
  const lines = [];

  const addValidations = () => {
    pushIndented(lines, 2, "validations:");
    pushIndented(lines, 3, `required: ${required}`);
  };

  if (field.type === "textarea") {
    pushIndented(lines, 1, "- type: textarea");
    pushIndented(lines, 2, `id: ${id}`);
    pushIndented(lines, 2, "attributes:");
    pushIndented(lines, 3, `label: ${field.label}`);
    if (field.placeholder) {
      pushIndented(lines, 3, `placeholder: ${field.placeholder}`);
    }
    addValidations();
    return lines;
  }

  if (field.type === "checkbox") {
    pushIndented(lines, 1, "- type: checkboxes");
    pushIndented(lines, 2, `id: ${id}`);
    pushIndented(lines, 2, "attributes:");
    pushIndented(lines, 3, `label: ${field.label}`);
    pushIndented(lines, 3, "options:");
    field.options.forEach((option) => {
      pushIndented(lines, 4, `- label: ${option.label}`);
    });
    return lines;
  }

  if (field.type === "select" || field.type === "radio" || field.type === "rating") {
    pushIndented(lines, 1, "- type: dropdown");
    pushIndented(lines, 2, `id: ${id}`);
    pushIndented(lines, 2, "attributes:");
    pushIndented(lines, 3, `label: ${field.label}`);
    pushIndented(lines, 3, "options:");

    const options =
      field.type === "rating"
        ? Array.from({ length: (field.scaleMax || 5) - (field.scaleMin || 1) + 1 }, (_, index) => String((field.scaleMin || 1) + index))
        : field.options.map((option) => option.label);

    options.forEach((option) => {
      pushIndented(lines, 4, `- ${toYamlScalar(option)}`);
    });

    addValidations();
    return lines;
  }

  pushIndented(lines, 1, "- type: input");
  pushIndented(lines, 2, `id: ${id}`);
  pushIndented(lines, 2, "attributes:");
  pushIndented(lines, 3, `label: ${field.label}`);
  if (field.placeholder) {
    pushIndented(lines, 3, `placeholder: ${field.placeholder}`);
  }
  addValidations();
  return lines;
};

const createTemplateContent = (survey) => {
  const lines = [
    `name: ${survey.title}`,
    `description: ${survey.description}`,
    `title: ${toYamlScalar(`[${survey.title}] `)}`,
    "labels:",
    "  - survey-response",
    `  - survey:${survey.id}`,
    "body:",
    "  - type: markdown",
    "    attributes:",
    "      value: |",
    `        感谢提交${survey.title}。该问卷会以公开 Issue 的形式保存，并参与自动汇总。`,
    `        Survey ID: ${survey.id}`,
    "  - type: input",
    "    id: github-username",
    "    attributes:",
    "      label: GitHub 用户名",
    "      placeholder: 例如 octocat",
    "    validations:",
    "      required: true",
  ];

  survey.fields.forEach((field) => {
    lines.push(...createFieldBlock(field));
  });

  return `${lines.join("\n")}\n`;
};

const run = async () => {
  const indexSource = await fs.readFile(indexPath, "utf8");
  const indexJson = JSON.parse(indexSource);
  const files = Array.isArray(indexJson.files) ? indexJson.files : [];

  await fs.mkdir(issueTemplateDir, { recursive: true });
  await fs.writeFile(
    configPath,
    [
      "blank_issues_enabled: false",
      "contact_links:",
      "  - name: 问卷说明",
      "    url: https://github.com/your-org/your-public-repo/blob/main/README.md",
      "    about: 先阅读仓库说明，再选择对应问卷模板提交。",
      "",
    ].join("\n"),
    "utf8"
  );

  for (const fileName of files) {
    const surveyPath = path.join(surveysDir, fileName);
    const survey = JSON.parse(await fs.readFile(surveyPath, "utf8"));
    const templatePath = path.join(issueTemplateDir, survey.issueTemplate);
    await fs.writeFile(templatePath, createTemplateContent(survey), "utf8");
  }

  console.log(`Generated ${files.length} issue templates successfully.`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});