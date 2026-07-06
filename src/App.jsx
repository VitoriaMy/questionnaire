import { useEffect, useState } from "react";
import { ClipboardList, Layers3, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

const SURVEY_INDEX_URL = `${import.meta.env.BASE_URL}surveys/index.json`;
const searchParams = new URLSearchParams(window.location.search);
const requestedSurveyId = (searchParams.get("survey") || "").trim();
const githubRepoUrl =
  import.meta.env.VITE_GITHUB_REPO_URL ||
  document.querySelector('meta[name="github-repo-url"]')?.getAttribute("content")?.trim() ||
  "";

const heroItems = [
  { icon: ClipboardList, label: "静态托管", text: "前端构建后可直接发布到 GitHub Pages。" },
  { icon: Layers3, label: "多问卷", text: "通过 URL 参数定位问卷，配置全部来自静态 JSON。" },
  { icon: Sparkles, label: "纯 GitHub 服务", text: "问卷提交进入公开仓库 Issues，再由 Actions 自动汇总。" },
];

const validateSurvey = (survey) => {
  if (!survey || typeof survey !== "object") {
    return false;
  }

  if (typeof survey.id !== "string" || !survey.id.trim()) {
    return false;
  }

  if (typeof survey.title !== "string" || !survey.title.trim()) {
    return false;
  }

  if (typeof survey.issueTemplate !== "string" || !survey.issueTemplate.trim()) {
    return false;
  }

  if (!Array.isArray(survey.fields) || survey.fields.length === 0) {
    return false;
  }

  return survey.fields.every((field) => {
    const supportsOptions = field.type === "select" || field.type === "radio" || field.type === "checkbox";
    const supportsRange = field.type === "rating";

    return (
      field &&
      typeof field.name === "string" &&
      field.name.trim() &&
      typeof field.label === "string" &&
      field.label.trim() &&
      ["input", "textarea", "email", "date", "rating", "select", "radio", "checkbox"].includes(field.type) &&
      (!supportsOptions ||
        (Array.isArray(field.options) &&
          field.options.length > 0 &&
          field.options.every(
            (option) =>
              option &&
              typeof option.value === "string" &&
              option.value.trim() &&
              typeof option.label === "string" &&
              option.label.trim()
          ))) &&
      (!supportsRange ||
        (Number.isInteger(field.scaleMin || 1) &&
          Number.isInteger(field.scaleMax || 5) &&
          (field.scaleMin || 1) < (field.scaleMax || 5)))
    );
  });
};

const fieldTypeLabels = {
  input: "单行输入",
  textarea: "多行输入",
  email: "邮箱",
  date: "日期",
  rating: "评分",
  select: "下拉选择",
  radio: "单选",
  checkbox: "多选",
};

const buildIssueUrl = (survey) => {
  if (!githubRepoUrl || !survey?.issueTemplate) {
    return "";
  }

  const params = new URLSearchParams({ template: survey.issueTemplate });
  return `${githubRepoUrl.replace(/\/$/, "")}/issues/new?${params.toString()}`;
};

export default function App() {
  const [surveys, setSurveys] = useState([]);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [status, setStatus] = useState({ message: "正在加载问卷配置...", tone: "info" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSurveys = async () => {
      try {
        const indexResponse = await fetch(SURVEY_INDEX_URL, { cache: "no-store" });
        if (!indexResponse.ok) {
          throw new Error("无法读取问卷目录索引。请检查 public/surveys/index.json 是否存在。");
        }

        const indexPayload = await indexResponse.json();
        const fileNames = Array.isArray(indexPayload.files) ? indexPayload.files : [];
        if (fileNames.length === 0) {
          throw new Error("问卷目录索引为空，请先在 surveys 目录下添加问卷 JSON 文件。");
        }

        const surveyResults = await Promise.all(
          fileNames.map(async (fileName) => {
            const response = await fetch(`${import.meta.env.BASE_URL}surveys/${encodeURIComponent(fileName)}`, {
              cache: "no-store",
            });

            if (!response.ok) {
              throw new Error(`问卷配置加载失败：${fileName}`);
            }

            const survey = await response.json();
            if (!validateSurvey(survey)) {
              throw new Error(`问卷配置格式无效：${fileName}`);
            }

            return survey;
          })
        );

        if (cancelled) {
          return;
        }

        setSurveys(surveyResults);
        const nextSurvey = surveyResults.find((survey) => survey.id === requestedSurveyId) || surveyResults[0];
        setActiveSurvey(nextSurvey);
        if (!githubRepoUrl || githubRepoUrl.includes("your-org/your-public-repo")) {
          setStatus({
            message: "请先在 index.html 或 VITE_GITHUB_REPO_URL 中配置真实的公开 GitHub 仓库地址。",
            tone: "error",
          });
          return;
        }

        if (requestedSurveyId && !surveyResults.some((survey) => survey.id === requestedSurveyId)) {
          setStatus({ message: "指定的问卷不存在，请检查 survey 参数。", tone: "error" });
          setActiveSurvey(null);
        } else {
          setStatus({ message: "", tone: "info" });
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({ message: error instanceof Error ? error.message : "问卷加载失败。", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSurveys();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedSurvey =
    activeSurvey ||
    (requestedSurveyId ? null : surveys[0]) ||
    null;

  const issueUrl = buildIssueUrl(resolvedSurvey);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl place-items-center px-6 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden p-8 lg:p-10">
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[linear-gradient(135deg,rgba(198,87,43,0.18),rgba(52,96,167,0.12))] blur-sm" />
          <CardHeader className="p-0">
            <Badge>Open Survey React</Badge>
            <CardTitle className="pt-4 text-4xl leading-tight lg:text-5xl">
              把问卷配置、反馈采集与仓库自动化放进同一条前端工作流
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              前端已切换为 React + shadcn 风格组件。页面从静态 JSON 加载问卷目录，并把提交入口转到公开仓库的 GitHub Issue Forms。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0 pt-8">
            {heroItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-4 rounded-3xl border border-white/60 bg-white/65 p-4">
                  <div className="rounded-2xl bg-accent p-3 text-accent-foreground shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader>
            <CardTitle>多问卷反馈中心</CardTitle>
            <CardDescription>
              通过地址栏中的 survey 参数加载指定问卷，问卷配置存放在 public/surveys 目录。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {surveys.map((survey) => (
                <a
                  key={survey.id}
                  href={`?survey=${encodeURIComponent(survey.id)}`}
                  className={cn(
                    "rounded-3xl border px-4 py-3 text-left transition",
                    resolvedSurvey?.id === survey.id
                      ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                      : "border-white/70 bg-white/70 text-foreground hover:border-primary/20 hover:bg-accent"
                  )}
                >
                  <div className="font-semibold">{survey.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{survey.shortDescription}</div>
                </a>
              ))}
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/60 p-5">
              <h3 className="text-lg font-semibold">{resolvedSurvey ? resolvedSurvey.title : "未找到问卷"}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {resolvedSurvey
                  ? resolvedSurvey.description
                  : "请检查地址中的 survey 参数，或从上方可用问卷列表重新进入。"}
              </p>
            </div>

            {status.message ? <Alert tone={status.tone}>{status.message}</Alert> : null}

            {resolvedSurvey ? (
              <div className="space-y-5">
                <div className="space-y-3">
                  {resolvedSurvey.fields.map((field) => (
                    <FormField
                      key={field.name}
                      label={field.label}
                      htmlFor={field.name}
                      description={field.description || field.placeholder || undefined}
                    >
                      <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-foreground">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="font-medium">{fieldTypeLabels[field.type] || field.type}</span>
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {field.required === false ? "选填" : "必填"}
                          </span>
                        </div>
                        {field.options ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {field.options.map((option) => (
                              <span
                                key={option.value || option.label}
                                className="rounded-full border border-white/70 bg-accent px-3 py-1 text-xs text-accent-foreground"
                              >
                                {option.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {field.type === "rating" ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            评分范围：{field.scaleMin || 1} - {field.scaleMax || 5}
                          </p>
                        ) : null}
                      </div>
                    </FormField>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <Button asChild size="lg" className="w-full" disabled={!issueUrl || loading}>
                    <a href={issueUrl || "#"} target="_blank" rel="noreferrer">
                      前往 GitHub 提交问卷
                    </a>
                  </Button>
                  <p className="text-xs leading-6 text-muted-foreground">
                    该模式下不再使用外部后端。点击后会打开公开仓库的 GitHub Issue Form，提交内容公开可见。
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}