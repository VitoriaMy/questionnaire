import { useEffect, useState } from "react";
import { ClipboardList, Layers3, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxCardGroup, RadioCardGroup, RatingGroup } from "@/components/ui/choice-group";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SURVEY_INDEX_URL = `${import.meta.env.BASE_URL}surveys/index.json`;
const searchParams = new URLSearchParams(window.location.search);
const requestedSurveyId = (searchParams.get("survey") || "").trim();
const apiUrl =
  import.meta.env.VITE_SURVEY_API_URL ||
  document.querySelector('meta[name="survey-api-url"]')?.getAttribute("content")?.trim() ||
  "";

const heroItems = [
  { icon: ClipboardList, label: "静态托管", text: "前端构建后可直接发布到 GitHub Pages。" },
  { icon: Layers3, label: "多问卷", text: "通过 URL 参数定位问卷，配置全部来自静态 JSON。" },
  { icon: Sparkles, label: "自动汇总", text: "每次提交都会进入 GitHub 数据仓库并触发报表更新。" },
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

const getFieldValue = (field, formData) => {
  if (field.type === "checkbox") {
    const values = formData.getAll(field.name).filter(Boolean);
    return values.length > 0 ? values.join(", ") : "-";
  }

  const value = formData.get(field.name);
  return value ? String(value) : "-";
};

const buildSummaryText = (survey, payload) => {
  return survey.fields.map((field) => `${field.label}: ${payload[field.name] || "-"}`).join(" | ");
};

function FieldRenderer({ field }) {
  const required = field.required !== false;
  const commonProps = {
    id: field.name,
    name: field.name,
    required,
    placeholder: field.placeholder || undefined,
  };

  if (field.type === "textarea") {
    return <Textarea {...commonProps} />;
  }

  if (field.type === "select") {
    return (
      <Select id={field.name} name={field.name} required={required} defaultValue="">
        <option value="">请选择</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === "radio") {
    return <RadioCardGroup name={field.name} options={field.options} required={required} />;
  }

  if (field.type === "checkbox") {
    return <CheckboxCardGroup name={field.name} options={field.options} required={required} />;
  }

  if (field.type === "rating") {
    return <RatingGroup name={field.name} min={field.scaleMin || 1} max={field.scaleMax || 5} required={required} />;
  }

  return <Input {...commonProps} type={field.type === "email" || field.type === "date" ? field.type : "text"} />;
}

export default function App() {
  const [surveys, setSurveys] = useState([]);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [status, setStatus] = useState({ message: "正在加载问卷配置...", tone: "info" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!activeSurvey) {
      setStatus({ message: "当前没有可提交的问卷，请先修正 survey 参数。", tone: "error" });
      return;
    }

    if (!apiUrl || apiUrl.includes("your-vercel-project")) {
      setStatus({ message: "请先配置真实的 Vercel API 地址。", tone: "error" });
      return;
    }

    const form = event.currentTarget;
    if (!form.reportValidity()) {
      setStatus({ message: "请完整填写必填项后再提交。", tone: "error" });
      return;
    }

    setSubmitting(true);
    setStatus({ message: "正在将数据发送到服务端，请稍候。", tone: "info" });

    const formData = new FormData(form);
    const payload = {
      surveyId: activeSurvey.id,
      surveyTitle: activeSurvey.title,
      username: formData.get("username"),
    };

    activeSurvey.fields.forEach((field) => {
      payload[field.name] = getFieldValue(field, formData);
    });

    payload.summaryText = buildSummaryText(activeSurvey, payload);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "提交失败，请稍后重试。");
      }

      form.reset();
      setStatus({ message: `提交成功，已写入 ${activeSurvey.title}。`, tone: "success" });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "网络请求异常，请检查接口状态。", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedSurvey =
    activeSurvey ||
    (requestedSurveyId ? null : surveys[0]) ||
    null;

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
              前端已切换为 React + shadcn 风格组件。页面从静态 JSON 加载指定问卷，再把反馈安全投递到 Vercel Serverless API。
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

            <form className="space-y-5" onSubmit={handleSubmit}>
              <FormField label="GitHub 用户名" htmlFor="username">
                <Input id="username" name="username" placeholder="例如: octocat" required disabled={!resolvedSurvey || loading || submitting} />
              </FormField>

              {resolvedSurvey
                ? resolvedSurvey.fields.map((field) => (
                    <FormField key={field.name} label={field.label} htmlFor={field.name} description={field.description}>
                      <FieldRenderer field={field} />
                    </FormField>
                  ))
                : null}

              <div className="space-y-3 pt-2">
                <Button type="submit" size="lg" className="w-full" disabled={!resolvedSurvey || loading || submitting}>
                  {submitting ? "正在安全提交..." : "提交反馈"}
                </Button>
                <p className="text-xs leading-6 text-muted-foreground">
                  部署前请把页面中的 API 地址替换为真实的 Vercel 地址，或在构建环境中设置 VITE_SURVEY_API_URL。
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}