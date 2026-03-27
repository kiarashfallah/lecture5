import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  Send,
  Lightbulb,
  AlertTriangle,
  Maximize,
  CircleSlash,
  FileText,
  Layers,
  BookOpen,
  Target,
  Flame,
  Trophy,
  Table2,
  Grid3X3,
  ArrowRight,
  Check,
  Info,
} from "lucide-react";

// --- GEMINI API INTEGRATION ---
// Simply paste your API key inside the quotes below!
const apiKey = "AIzaSyCTh4Q_UYRuOX_m1gjVCRkG_LRemslcAHQ";

const callGeminiJSON = async (prompt, systemInstruction, schemaProperties) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: schemaProperties,
        required: Object.keys(schemaProperties),
      },
    },
  };

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text);
    } catch (e) {
      retries--;
      if (retries === 0)
        throw new Error("AI connection failed. Please try again.");
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
};

// --- DATA: SLIDE EXAMPLES ---
const SLIDE_PROBLEMS = [
  {
    id: "slide16",
    label: "Slide 16: F(w,x,y,z)",
    vars: 4,
    varNames: "w,x,y,z",
    minterms: [4, 5, 10, 11, 14, 15],
  },
  {
    id: "slide36",
    label: "Slide 36: F(A,B,C,D)",
    vars: 4,
    varNames: "A,B,C,D",
    minterms: [0, 2, 5, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  {
    id: "slide39",
    label: "Slide 39: f(x,y,z)",
    vars: 3,
    varNames: "x,y,z",
    minterms: [0, 1, 2, 4, 6, 7],
  },
  {
    id: "slide40",
    label: "Slide 40: f(x,y,z)",
    vars: 3,
    varNames: "x,y,z",
    minterms: [3, 4, 5, 7],
  },
  {
    id: "slide41",
    label: "Slide 41: f(x,y,z)",
    vars: 3,
    varNames: "x,y,z",
    minterms: [3, 4, 6, 7],
  },
  {
    id: "slide42",
    label: "Slide 42: f(x,y,z)",
    vars: 3,
    varNames: "x,y,z",
    minterms: [2, 3, 5, 6, 7],
  },
  {
    id: "slide53",
    label: "Slide 53-57: F(A,B,C,D)",
    vars: 4,
    varNames: "A,B,C,D",
    minterms: [2, 3, 4, 5, 7, 8, 10, 13, 15],
  },
  {
    id: "slide58",
    label: "Slide 58-61: F(A,B,C,D)",
    vars: 4,
    varNames: "A,B,C,D",
    minterms: [0, 2, 8, 9, 10, 11, 13, 14, 15],
  },
];

// --- LOGIC HELPERS ---
const generateGrid = (vars, minterms, dontCares = []) => {
  let grid, rowHeaders, colHeaders, positions;

  if (vars === 3) {
    grid = Array(2)
      .fill()
      .map(() => Array(4).fill(0));
    rowHeaders = ["0", "1"];
    colHeaders = ["00", "01", "11", "10"];
    positions = {
      0: [0, 0],
      1: [0, 1],
      3: [0, 2],
      2: [0, 3],
      4: [1, 0],
      5: [1, 1],
      7: [1, 2],
      6: [1, 3],
    };
  } else {
    grid = Array(4)
      .fill()
      .map(() => Array(4).fill(0));
    rowHeaders = ["00", "01", "11", "10"];
    colHeaders = ["00", "01", "11", "10"];
    positions = {
      0: [0, 0],
      1: [0, 1],
      3: [0, 2],
      2: [0, 3],
      4: [1, 0],
      5: [1, 1],
      7: [1, 2],
      6: [1, 3],
      12: [2, 0],
      13: [2, 1],
      15: [2, 2],
      14: [2, 3],
      8: [3, 0],
      9: [3, 1],
      11: [3, 2],
      10: [3, 3],
    };
  }

  minterms.forEach((m) => {
    if (positions[m]) grid[positions[m][0]][positions[m][1]] = 1;
  });
  dontCares.forEach((m) => {
    if (positions[m]) grid[positions[m][0]][positions[m][1]] = "X";
  });

  return { grid, rowHeaders, colHeaders };
};

const generateCanonicalSOP = (vars, varNamesStr, minterms) => {
  if (!minterms || minterms.length === 0) return "0";
  const names = varNamesStr.split(",");
  return minterms
    .map((m) => {
      const bin = m.toString(2).padStart(vars, "0");
      return bin
        .split("")
        .map((bit, idx) => (bit === "1" ? names[idx] : `${names[idx]}'`))
        .join("");
    })
    .join(" + ");
};

// --- RENDER COMPONENTS ---
const TruthTableRender = ({
  vars,
  varNames,
  mintermsF,
  dontCaresF = [],
  mintermsG = null,
}) => {
  const names = varNames.split(",");
  const rows = Math.pow(2, vars);
  const isShared = mintermsG !== null;

  return (
    <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-sm scrollbar-hide">
      <table className="w-full text-center text-sm">
        <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
          <tr>
            {names.map((n) => (
              <th
                key={n}
                className="py-2.5 px-3 border-b text-slate-600 font-bold"
              >
                {n}
              </th>
            ))}
            <th className="py-2.5 px-3 border-b border-l bg-indigo-50 text-indigo-800 font-bold">
              F
            </th>
            {isShared && (
              <th className="py-2.5 px-3 border-b bg-purple-50 text-purple-800 font-bold">
                G
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => {
            const bin = i.toString(2).padStart(vars, "0");
            const valF = mintermsF.includes(i)
              ? "1"
              : dontCaresF.includes(i)
              ? "X"
              : "0";
            const valG = isShared ? (mintermsG.includes(i) ? "1" : "0") : null;

            return (
              <tr
                key={i}
                className="hover:bg-slate-50 border-b last:border-0 transition-colors"
              >
                {bin.split("").map((b, idx) => (
                  <td
                    key={idx}
                    className="py-1.5 px-3 text-slate-500 font-mono"
                  >
                    {b}
                  </td>
                ))}
                <td
                  className={`py-1.5 px-3 border-l font-black ${
                    valF === "1"
                      ? "text-indigo-600 bg-indigo-50/50"
                      : valF === "X"
                      ? "text-amber-500 bg-amber-50/50"
                      : "text-slate-300"
                  }`}
                >
                  {valF}
                </td>
                {isShared && (
                  <td
                    className={`py-1.5 px-3 font-black ${
                      valG === "1"
                        ? "text-purple-600 bg-purple-50/50"
                        : "text-slate-300"
                    }`}
                  >
                    {valG}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const KMapRender = ({
  vars,
  varNames = "a,b,c,d",
  mapData,
  rowHeaders,
  colHeaders,
  title,
  highlightGroups = [],
}) => {
  const names = varNames.split(",");
  const cornerLabel =
    vars === 3
      ? `${names[0]} \\ ${names[1]}${names[2]}`
      : `${names[0]}${names[1]} \\ ${names[2]}${names[3]}`;

  const getCellBg = (r, c, val) => {
    const highlights = [...highlightGroups].reverse();
    const activeHighlight = highlights.find((hg) =>
      hg.cells.some(([hr, hc]) => hr === r && hc === c)
    );
    if (activeHighlight) return `${activeHighlight.color} font-black`;
    if (val === 1) return "bg-indigo-50 text-indigo-700 font-black";
    if (val === "X") return "bg-amber-50 text-amber-600 font-black";
    return "text-slate-300 font-medium";
  };

  return (
    <div className="flex flex-col items-center bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full max-w-sm hover:shadow-md transition-shadow duration-300">
      {title && (
        <div className="w-full bg-slate-50 py-2.5 text-center border-b border-slate-200 font-bold text-slate-700 text-sm tracking-wide uppercase">
          {title}
        </div>
      )}
      <div className="p-5 overflow-x-auto w-full flex justify-center">
        <table className="border-collapse text-center bg-white">
          <thead>
            <tr>
              <th className="p-2 border-b-2 border-r-2 border-slate-300 bg-slate-50 text-xs font-bold text-slate-500 whitespace-nowrap">
                {cornerLabel}
              </th>
              {colHeaders.map((h) => (
                <th
                  key={h}
                  className="w-12 p-2 border-b-2 border-slate-300 bg-slate-50 text-sm font-bold text-slate-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowHeaders.map((rHeader, r) => (
              <tr key={rHeader}>
                <th className="p-2 border-r-2 border-slate-300 bg-slate-50 text-sm font-bold text-slate-700">
                  {rHeader}
                </th>
                {colHeaders.map((_, c) => {
                  const val = mapData[r][c];
                  return (
                    <td
                      key={c}
                      className={`border border-slate-200 w-12 h-12 text-xl transition-all hover:brightness-95 cursor-default ${getCellBg(
                        r,
                        c,
                        val
                      )}`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState("learn");
  const [activeLearnTopic, setActiveLearnTopic] = useState("rules");

  // Gamification State
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  // Settings for Practice
  const [practiceMode, setPracticeMode] = useState("single");
  const [varCount, setVarCount] = useState(4);
  const [useDontCares, setUseDontCares] = useState(false);
  const [problemFormat, setProblemFormat] = useState("minterms"); // 'minterms', 'formula', 'table'
  const [viewMode, setViewMode] = useState("kmap"); // 'kmap' or 'table'

  // AI Practice State
  const [aiProblem, setAiProblem] = useState(null);
  const [userAnswerF, setUserAnswerF] = useState("");
  const [userAnswerG, setUserAnswerG] = useState("");
  const [userAnswerShared, setUserAnswerShared] = useState("");

  const [aiFeedback, setAiFeedback] = useState(null);
  const [status, setStatus] = useState("idle");
  const [apiError, setApiError] = useState("");

  const defaultVarNames = (vars) => (vars === 3 ? "A,B,C" : "A,B,C,D");

  // --- PROBLEM GENERATION & SELECTION ---
  const generateProblem = async () => {
    setStatus("generating");
    setApiError("");
    setAiFeedback(null);
    setUserAnswerF("");
    setUserAnswerG("");
    setUserAnswerShared("");

    try {
      let prompt, instruction, schema;

      if (practiceMode === "single") {
        prompt = `Generate a ${varCount}-variable Karnaugh Map problem using ${defaultVarNames(
          varCount
        )}. 
                  ${
                    useDontCares
                      ? "Include 1 to 4 'Don't Care' conditions."
                      : "No don't cares."
                  }`;
        instruction = `You are a Digital Logic tutor. Output JSON. max_minterm_value is ${
          Math.pow(2, varCount) - 1
        }.`;
        schema = {
          minterms: { type: "ARRAY", items: { type: "INTEGER" } },
          dont_cares: { type: "ARRAY", items: { type: "INTEGER" } },
          expected_sop: { type: "STRING" },
        };
      } else {
        prompt = `Generate a Multiple Output K-Map problem for functions f and g, using ${varCount} variables (${defaultVarNames(
          varCount
        )}).
                  Design it specifically so that they share exactly ONE common prime implicant term to save logic gates. No don't cares.`;
        instruction = `Output JSON representing two functions. They MUST have an optimal shared term.`;
        schema = {
          f_minterms: { type: "ARRAY", items: { type: "INTEGER" } },
          g_minterms: { type: "ARRAY", items: { type: "INTEGER" } },
          expected_f_sop: { type: "STRING" },
          expected_g_sop: { type: "STRING" },
          expected_shared_term: { type: "STRING" },
        };
      }

      const result = await callGeminiJSON(prompt, instruction, schema);
      setAiProblem({
        mode: practiceMode,
        source: "ai",
        vars: varCount,
        varNames: defaultVarNames(varCount),
        data: result,
      });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setStatus("idle");
    }
  };

  const selectSlideProblem = (slideId) => {
    const prob = SLIDE_PROBLEMS.find((p) => p.id === slideId);
    setApiError("");
    setAiFeedback(null);
    setUserAnswerF("");
    setUserAnswerG("");
    setUserAnswerShared("");
    setAiProblem({
      mode: "single",
      source: "slide",
      vars: prob.vars,
      varNames: prob.varNames,
      data: { minterms: prob.minterms, dont_cares: [] },
    });
    setPracticeMode("single");
  };

  // --- EVALUATION ---
  const evaluateAnswer = async () => {
    if (practiceMode === "single" && !userAnswerF.trim()) return;
    if (
      practiceMode === "shared" &&
      (!userAnswerF.trim() || !userAnswerG.trim() || !userAnswerShared.trim())
    )
      return;

    setStatus("evaluating");
    setApiError("");

    try {
      let prompt, instruction, schema;

      if (aiProblem.mode === "single") {
        const vNames = aiProblem.varNames;
        prompt = `Variables: ${vNames}. Minterms: ${aiProblem.data.minterms.join(
          ", "
        )}. Don't Cares: ${(aiProblem.data.dont_cares || []).join(", ")}.
                  Student Answer: "${userAnswerF}".`;
        instruction = `You are an expert K-Map tutor. Evaluate if the student's Sum-of-Products (SOP) is logically equivalent AND fully minimized (fewest terms/literals). Provide strict, educational feedback.`;
      } else {
        const vNames = aiProblem.varNames;
        prompt = `Variables: ${vNames}. 
                  Expected f: ${aiProblem.data.expected_f_sop}, Student f: "${userAnswerF}". 
                  Expected g: ${aiProblem.data.expected_g_sop}, Student g: "${userAnswerG}". 
                  Expected shared term: ${aiProblem.data.expected_shared_term}, Student shared term: "${userAnswerShared}".`;
        instruction = `Evaluate if student correctly minimized both functions AND identified the mathematically equivalent optimal shared logic term.`;
      }

      schema = {
        is_correct: { type: "BOOLEAN" },
        feedback: {
          type: "STRING",
          description:
            "Encouraging but detailed explanation of what they did right or wrong.",
        },
        correct_solution: {
          type: "STRING",
          description: "The definitive correct minimum SOP.",
        },
      };

      const result = await callGeminiJSON(prompt, instruction, schema);
      setAiFeedback(result);

      if (result.is_correct) {
        setScore((prev) => prev + (aiProblem.mode === "single" ? 100 : 250));
        setStreak((prev) => prev + 1);
      } else {
        setStreak(0);
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setStatus("idle");
    }
  };

  useEffect(() => {
    if (activeMainTab === "practice") {
      setAiProblem(null);
      setAiFeedback(null);
      setStatus("idle");
    }
  }, [varCount, useDontCares, practiceMode, activeMainTab]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-4 md:p-8 font-sans text-slate-800 flex flex-col">
      <div className="max-w-6xl mx-auto space-y-6 flex-1 w-full flex flex-col">
        {/* HEADER */}
        <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                <Layers className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                K-Map{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Mastery
                </span>
              </h1>
            </div>
            <p className="text-slate-500 font-medium mt-1 ml-14">
              Comprehensive Study Guide & AI Simulator
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Gamification Stats */}
            {activeMainTab === "practice" && (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Score
                  </span>
                  <div className="flex items-center gap-1 font-black text-lg text-slate-700">
                    <Trophy className="w-5 h-5 text-amber-500" /> {score}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Streak
                  </span>
                  <div
                    className={`flex items-center gap-1 font-black text-lg ${
                      streak > 2
                        ? "text-orange-500 animate-pulse"
                        : "text-slate-700"
                    }`}
                  >
                    <Flame
                      className={`w-5 h-5 ${
                        streak > 0 ? "text-orange-500" : "text-slate-300"
                      }`}
                    />{" "}
                    {streak}
                  </div>
                </div>
              </div>
            )}

            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
              <button
                onClick={() => setActiveMainTab("learn")}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  activeMainTab === "learn"
                    ? "bg-white shadow-md text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <BookOpen className="w-5 h-5" /> Guide
              </button>
              <button
                onClick={() => setActiveMainTab("practice")}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  activeMainTab === "practice"
                    ? "bg-white shadow-md text-purple-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Target className="w-5 h-5" /> Practice
              </button>
            </div>
          </div>
        </header>

        {/* --- TEACHING MODULE --- */}
        {activeMainTab === "learn" && (
          <div className="grid lg:grid-cols-4 gap-6 animate-in fade-in duration-500 flex-1">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-2">
              <button
                onClick={() => setActiveLearnTopic("rules")}
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${
                  activeLearnTopic === "rules"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200"
                }`}
              >
                1. Basic Grouping
              </button>
              <button
                onClick={() => setActiveLearnTopic("advanced")}
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${
                  activeLearnTopic === "advanced"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200"
                }`}
              >
                2. Redundant Groups
              </button>
              <button
                onClick={() => setActiveLearnTopic("dontcare")}
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${
                  activeLearnTopic === "dontcare"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200"
                }`}
              >
                3. Don't Cares
              </button>
              <button
                onClick={() => setActiveLearnTopic("logicsharing")}
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${
                  activeLearnTopic === "logicsharing"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200"
                }`}
              >
                4. Logic Sharing
              </button>
              <button
                onClick={() => setActiveLearnTopic("pos")}
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${
                  activeLearnTopic === "pos"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200"
                }`}
              >
                5. POS Minimization
              </button>
              <button
                onClick={() => setActiveLearnTopic("slides")}
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${
                  activeLearnTopic === "slides"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200"
                }`}
              >
                6. Lecture 5 Breakdown
              </button>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
              {activeLearnTopic === "rules" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">
                    The Golden Rules of Grouping
                  </h2>
                  <p className="text-slate-600 text-lg">
                    Instead of messy Boolean algebra, K-Maps let us visually
                    simplify expressions. Master these four fundamental laws.
                  </p>
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex flex-col items-center text-center">
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-rose-800">
                        <AlertTriangle className="w-5 h-5" /> 1. Powers of 2
                        Only
                      </h3>
                      <KMapRender
                        vars={4}
                        mapData={generateGrid(4, [5, 6, 7]).grid}
                        rowHeaders={["00", "01", "11", "10"]}
                        colHeaders={["00", "01", "11", "10"]}
                        highlightGroups={[
                          {
                            cells: [
                              [1, 1],
                              [1, 2],
                              [1, 3],
                            ],
                            color:
                              "bg-red-100 text-red-800 border-4 border-red-500 border-dashed",
                          },
                        ]}
                      />
                    </div>
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-blue-800">
                        <Maximize className="w-5 h-5" /> 2. Go Big! (Max Size)
                      </h3>
                      <KMapRender
                        vars={3}
                        mapData={generateGrid(3, [2, 3, 6, 7]).grid}
                        rowHeaders={["0", "1"]}
                        colHeaders={["00", "01", "11", "10"]}
                        highlightGroups={[
                          {
                            cells: [
                              [0, 2],
                              [0, 3],
                              [1, 2],
                              [1, 3],
                            ],
                            color:
                              "bg-blue-200 text-blue-900 border-2 border-blue-500",
                          },
                        ]}
                      />
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-emerald-800">
                        <RefreshCw className="w-5 h-5" /> 3. The Map is a Torus
                      </h3>
                      <KMapRender
                        vars={4}
                        mapData={generateGrid(4, [0, 2, 8, 10]).grid}
                        rowHeaders={["00", "01", "11", "10"]}
                        colHeaders={["00", "01", "11", "10"]}
                        highlightGroups={[
                          {
                            cells: [
                              [0, 0],
                              [0, 3],
                              [3, 0],
                              [3, 3],
                            ],
                            color:
                              "bg-emerald-200 text-emerald-900 border-2 border-emerald-500",
                          },
                        ]}
                      />
                    </div>
                    <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-slate-800">
                        <CircleSlash className="w-5 h-5" /> 4. No Zeros Allowed
                      </h3>
                      <KMapRender
                        vars={3}
                        mapData={generateGrid(3, [0, 1, 2]).grid}
                        rowHeaders={["0", "1"]}
                        colHeaders={["00", "01", "11", "10"]}
                        highlightGroups={[
                          {
                            cells: [
                              [0, 0],
                              [0, 1],
                              [0, 2],
                              [0, 3],
                            ],
                            color:
                              "bg-slate-300 text-slate-800 border-4 border-slate-500 border-dashed",
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}
              {activeLearnTopic === "advanced" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">
                    Redundant Prime Implicants
                  </h2>
                  <p className="text-slate-600 text-lg">
                    You <strong>can and should</strong> reuse 1s to make groups
                    larger, but you must avoid creating groups that are entirely
                    covered by other groups.
                  </p>
                  <div className="grid md:grid-cols-2 gap-8 mt-6">
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                      <h3 className="font-bold text-lg mb-3 text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 /> Good Overlap
                      </h3>
                      <KMapRender
                        vars={3}
                        mapData={generateGrid(3, [1, 3, 2]).grid}
                        rowHeaders={["0", "1"]}
                        colHeaders={["00", "01", "11", "10"]}
                        highlightGroups={[
                          {
                            cells: [
                              [0, 1],
                              [0, 2],
                            ],
                            color:
                              "bg-blue-200 text-blue-900 border-2 border-blue-400",
                          },
                          {
                            cells: [
                              [0, 2],
                              [0, 3],
                            ],
                            color:
                              "bg-purple-200 text-purple-900 border-2 border-purple-400 bg-opacity-70",
                          },
                        ]}
                      />
                    </div>
                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                      <h3 className="font-bold text-lg mb-3 text-rose-800 flex items-center gap-2">
                        <AlertTriangle /> Redundant Group
                      </h3>
                      <KMapRender
                        vars={4}
                        mapData={generateGrid(4, [1, 3, 5, 7, 13, 15]).grid}
                        rowHeaders={["00", "01", "11", "10"]}
                        colHeaders={["00", "01", "11", "10"]}
                        highlightGroups={[
                          {
                            cells: [
                              [0, 1],
                              [0, 2],
                              [1, 1],
                              [1, 2],
                            ],
                            color:
                              "bg-blue-200 text-blue-900 border-2 border-blue-400",
                          },
                          {
                            cells: [
                              [1, 1],
                              [1, 2],
                              [2, 1],
                              [2, 2],
                            ],
                            color:
                              "bg-purple-200 text-purple-900 border-2 border-purple-400 bg-opacity-70",
                          },
                          {
                            cells: [
                              [1, 1],
                              [1, 2],
                            ],
                            color:
                              "bg-red-300 text-red-900 border-4 border-red-500 bg-opacity-50",
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}
              {activeLearnTopic === "dontcare" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">
                    Don't Care Conditions (X)
                  </h2>
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-3 rounded-full text-amber-600 mt-1 shadow-sm">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <p className="text-slate-600 text-lg">
                      <strong>The Golden Rule:</strong> Treat an 'X' as a 1{" "}
                      <i>only if</i> it makes a group larger. Otherwise, ignore
                      it like a 0.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-center p-8 bg-gradient-to-br from-slate-50 to-amber-50 rounded-3xl border border-amber-100 shadow-inner">
                    <KMapRender
                      vars={4}
                      title="BCD Logic Example"
                      mapData={
                        generateGrid(4, [5, 7, 8, 9], [10, 11, 12, 13, 14, 15])
                          .grid
                      }
                      rowHeaders={["00", "01", "11", "10"]}
                      colHeaders={["00", "01", "11", "10"]}
                      highlightGroups={[
                        {
                          cells: [
                            [3, 0],
                            [3, 1],
                            [2, 0],
                            [2, 1],
                          ],
                          color:
                            "bg-blue-100 text-blue-800 border-2 border-blue-400",
                        },
                        {
                          cells: [
                            [1, 1],
                            [1, 2],
                            [2, 1],
                            [2, 2],
                          ],
                          color:
                            "bg-purple-100 text-purple-800 border-2 border-purple-400",
                        },
                      ]}
                    />
                  </div>
                </div>
              )}
              {activeLearnTopic === "logicsharing" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-extrabold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-3">
                    Logic Sharing
                  </h2>
                  <p className="text-slate-600 text-lg">
                    When designing circuits with multiple outputs (f and g),
                    look for <strong>Common Terms</strong> between the K-Maps to
                    share hardware and save gates.
                  </p>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mt-6 shadow-inner">
                    <div className="flex flex-col md:flex-row gap-8 justify-center">
                      <div className="flex-1">
                        <KMapRender
                          vars={3}
                          title="Map of f"
                          mapData={generateGrid(3, [0, 2, 6, 7]).grid}
                          rowHeaders={["0", "1"]}
                          colHeaders={["00", "01", "11", "10"]}
                          highlightGroups={[
                            {
                              cells: [
                                [1, 2],
                                [1, 3],
                              ],
                              color:
                                "bg-green-200 text-green-900 border-2 border-green-500 shadow-sm",
                            },
                            {
                              cells: [
                                [0, 0],
                                [0, 3],
                              ],
                              color: "bg-slate-200 border-2 border-slate-400",
                            },
                          ]}
                        />
                      </div>
                      <div className="flex-1">
                        <KMapRender
                          vars={3}
                          title="Map of g"
                          mapData={generateGrid(3, [1, 3, 6, 7]).grid}
                          rowHeaders={["0", "1"]}
                          colHeaders={["00", "01", "11", "10"]}
                          highlightGroups={[
                            {
                              cells: [
                                [1, 2],
                                [1, 3],
                              ],
                              color:
                                "bg-green-200 text-green-900 border-2 border-green-500 shadow-sm",
                            },
                            {
                              cells: [
                                [0, 1],
                                [0, 2],
                              ],
                              color: "bg-slate-200 border-2 border-slate-400",
                            },
                          ]}
                        />
                      </div>
                    </div>
                    <p className="text-center mt-6 text-sm font-bold text-green-700 bg-green-100 py-2 rounded-xl">
                      Shared Term Identified: BC
                    </p>
                  </div>
                </div>
              )}
              {activeLearnTopic === "pos" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">
                    Product-of-Sums (POS) Minimization
                  </h2>
                  <p className="text-slate-600 text-lg">
                    Instead of grouping 1s to find the Sum-of-Products (SOP), we
                    can group the <strong>0s (maxterms)</strong> to find the
                    complement function (F'), and then use DeMorgan's Theorem to
                    find the simplest POS expression.
                  </p>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mt-6 shadow-inner">
                    <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
                      <div className="flex-1">
                        <h3 className="text-center font-bold text-slate-700 mb-4 bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                          Step 1: Group the 0s for F'
                        </h3>
                        <KMapRender
                          vars={4}
                          title="F = Σm(0,1,2,3,5,7,8,9,10,11)"
                          mapData={
                            generateGrid(4, [0, 1, 2, 3, 5, 7, 8, 9, 10, 11])
                              .grid
                          }
                          rowHeaders={["00", "01", "11", "10"]}
                          colHeaders={["00", "01", "11", "10"]}
                          highlightGroups={[
                            {
                              cells: [
                                [2, 0],
                                [2, 1],
                                [2, 2],
                                [2, 3],
                              ],
                              color:
                                "bg-blue-200 text-blue-900 border-2 border-blue-500",
                            }, // AB
                            {
                              cells: [
                                [1, 0],
                                [1, 3],
                                [2, 0],
                                [2, 3],
                              ],
                              color:
                                "bg-rose-200 text-rose-900 border-2 border-rose-500 bg-opacity-70",
                            }, // BD'
                          ]}
                        />
                      </div>
                      <div className="flex-1 space-y-4 text-base">
                        <div className="p-5 bg-white rounded-xl border-l-4 border-blue-500 shadow-sm">
                          <strong>Finding F':</strong> By looping the groups of
                          0s on the map, we construct the SOP for the inverted
                          function.
                          <div className="mt-2 font-mono text-lg text-slate-700 bg-slate-50 p-2 rounded text-center border border-slate-100">
                            F' = BD' + AB
                          </div>
                        </div>
                        <div className="p-5 bg-white rounded-xl border-l-4 border-purple-500 shadow-sm">
                          <strong>Applying DeMorgan's:</strong> Invert the
                          expression to get F. Change AND to OR, OR to AND, and
                          flip the variables.
                          <div className="mt-2 font-mono text-lg text-purple-700 bg-purple-50 p-2 rounded text-center border border-purple-100">
                            F = (B' + D)(A' + B')
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeLearnTopic === "slides" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-extrabold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-3">
                    <Info className="w-6 h-6 text-indigo-500" /> Lecture 5
                    Breakdown
                  </h2>
                  <p className="text-slate-600 text-lg">
                    A clear, step-by-step visual breakdown of the crucial
                    examples from your lecture slides.
                  </p>

                  <div className="space-y-10 mt-6">
                    {/* Example 1 (Slide 16) */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">
                            Example 1 (Slide 16)
                          </h3>
                          <p className="text-slate-500 font-mono text-sm mt-1">
                            F(w,x,y,z) = Σm(4,5,10,11,14,15)
                          </p>
                        </div>
                      </div>
                      <div className="p-6 grid md:grid-cols-2 gap-8 items-start">
                        <div className="flex justify-center">
                          <KMapRender
                            vars={4}
                            varNames="w,x,y,z"
                            mapData={
                              generateGrid(4, [4, 5, 10, 11, 14, 15]).grid
                            }
                            rowHeaders={["00", "01", "11", "10"]}
                            colHeaders={["00", "01", "11", "10"]}
                            highlightGroups={[
                              {
                                cells: [
                                  [1, 0],
                                  [1, 1],
                                ],
                                color: "bg-blue-200 border-2 border-blue-400",
                              }, // w'xy'
                              {
                                cells: [
                                  [3, 2],
                                  [3, 3],
                                  [2, 2],
                                  [2, 3],
                                ],
                                color:
                                  "bg-purple-200 border-2 border-purple-400",
                              }, // wy
                            ]}
                          />
                        </div>
                        <div className="space-y-5">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                              Step-by-Step Grouping
                            </h4>
                            <div className="space-y-4">
                              <div className="flex gap-3 items-start">
                                <div className="w-4 h-4 rounded-full bg-purple-400 border border-purple-600 shrink-0 mt-1"></div>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    The 2x2 Square{" "}
                                    <span className="font-mono text-purple-700 ml-1">
                                      (wy)
                                    </span>
                                  </p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    We group four 1s by wrapping around the
                                    bottom and right edges together. This
                                    eliminates the variables <strong>x</strong>{" "}
                                    and <strong>z</strong>.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3 items-start">
                                <div className="w-4 h-4 rounded-full bg-blue-400 border border-blue-600 shrink-0 mt-1"></div>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    The Horizontal Pair{" "}
                                    <span className="font-mono text-blue-700 ml-1">
                                      (w'xy')
                                    </span>
                                  </p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    These two adjacent 1s form a pair on the
                                    left, eliminating the variable{" "}
                                    <strong>z</strong>.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                              Final Minimized Expression
                            </p>
                            <p className="font-mono text-xl font-black text-indigo-700">
                              F = w'xy' + wy
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Example 2 (Slide 40) */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">
                            Example 2 (Slide 40)
                          </h3>
                          <p className="text-slate-500 font-mono text-sm mt-1">
                            f(x,y,z) = Σm(3,4,5,7)
                          </p>
                        </div>
                      </div>
                      <div className="p-6 grid md:grid-cols-2 gap-8 items-start">
                        <div className="flex justify-center">
                          <KMapRender
                            vars={3}
                            varNames="x,y,z"
                            mapData={generateGrid(3, [3, 4, 5, 7]).grid}
                            rowHeaders={["0", "1"]}
                            colHeaders={["00", "01", "11", "10"]}
                            highlightGroups={[
                              {
                                cells: [
                                  [1, 1],
                                  [1, 2],
                                ],
                                color:
                                  "bg-emerald-200 border-2 border-emerald-400",
                              }, // xz
                              {
                                cells: [
                                  [1, 0],
                                  [1, 1],
                                ],
                                color: "bg-blue-200 border-2 border-blue-400",
                              }, // xy'
                            ]}
                          />
                        </div>
                        <div className="space-y-5">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                              Step-by-Step Grouping
                            </h4>
                            <div className="space-y-4">
                              <div className="flex gap-3 items-start">
                                <div className="w-4 h-4 rounded-full bg-blue-400 border border-blue-600 shrink-0 mt-1"></div>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    The First Pair{" "}
                                    <span className="font-mono text-blue-700 ml-1">
                                      (xy')
                                    </span>
                                  </p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    A standard horizontal grouping of two 1s on
                                    the bottom row.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3 items-start">
                                <div className="w-4 h-4 rounded-full bg-emerald-400 border border-emerald-600 shrink-0 mt-1"></div>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    The Shared Pair{" "}
                                    <span className="font-mono text-emerald-700 ml-1">
                                      (xz)
                                    </span>
                                  </p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    Notice how minterm 5 is shared between both
                                    groups? This is completely allowed and
                                    necessary to make the groups as large as
                                    possible.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                              Final Minimized Expression
                            </p>
                            <p className="font-mono text-xl font-black text-indigo-700">
                              f = xy' + xz
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Example 3 (Slide 53) */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">
                            Example 3 (Slide 53)
                          </h3>
                          <p className="text-slate-500 font-mono text-sm mt-1">
                            f(A,B,C,D) = Σm(2,3,4,5,7,8,10,13,15)
                          </p>
                        </div>
                      </div>
                      <div className="p-6 grid md:grid-cols-2 gap-8 items-start">
                        <div className="flex justify-center">
                          <KMapRender
                            vars={4}
                            varNames="A,B,C,D"
                            mapData={
                              generateGrid(4, [2, 3, 4, 5, 7, 8, 10, 13, 15])
                                .grid
                            }
                            rowHeaders={["00", "01", "11", "10"]}
                            colHeaders={["00", "01", "11", "10"]}
                            highlightGroups={[
                              {
                                cells: [
                                  [1, 1],
                                  [1, 2],
                                  [2, 1],
                                  [2, 2],
                                ],
                                color:
                                  "bg-emerald-200 border-2 border-emerald-400",
                              }, // BD
                              {
                                cells: [
                                  [3, 0],
                                  [3, 3],
                                ],
                                color: "bg-rose-200 border-2 border-rose-400",
                              }, // AB'D'
                              {
                                cells: [
                                  [1, 0],
                                  [1, 1],
                                ],
                                color: "bg-blue-200 border-2 border-blue-400",
                              }, // A'BC'
                              {
                                cells: [
                                  [0, 2],
                                  [0, 3],
                                ],
                                color:
                                  "bg-purple-200 border-2 border-purple-400",
                              }, // A'B'C
                            ]}
                          />
                        </div>
                        <div className="space-y-5">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                              Step-by-Step Grouping
                            </h4>
                            <div className="space-y-4">
                              <div className="flex gap-3 items-start">
                                <div className="w-4 h-4 rounded-full bg-emerald-400 border border-emerald-600 shrink-0 mt-1"></div>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    The 2x2 Core{" "}
                                    <span className="font-mono text-emerald-700 ml-1">
                                      (BD)
                                    </span>
                                  </p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    Always start by finding the largest possible
                                    block. This 2x2 square in the middle is our
                                    biggest prime implicant.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3 items-start">
                                <div className="w-4 h-4 rounded-full bg-rose-400 border border-rose-600 shrink-0 mt-1"></div>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    The Edge Wrap{" "}
                                    <span className="font-mono text-rose-700 ml-1">
                                      (AB'D')
                                    </span>
                                  </p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    Look at the edges! Minterms 8 and 10 wrap
                                    around the map horizontally to form a pair.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3 items-start">
                                <div className="w-4 h-4 rounded-full bg-blue-400 border border-blue-600 shrink-0 mt-1 flex items-center justify-center text-white text-[10px]"></div>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    Remaining Pairs{" "}
                                    <span className="font-mono text-blue-700 ml-1">
                                      (A'BC')
                                    </span>{" "}
                                    and{" "}
                                    <span className="font-mono text-purple-700 ml-1">
                                      (A'B'C)
                                    </span>
                                  </p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    Finally, we cover the remaining isolated 1s
                                    with the largest possible pairs left.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                              Final Minimized Expression
                            </p>
                            <p className="font-mono text-lg font-black text-indigo-700">
                              f = BD + AB'D' + A'BC' + A'B'C
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- AI TESTING MODULE --- */}
        {activeMainTab === "practice" && (
          <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in duration-500 flex-1">
            {/* Settings Column */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-500" /> AI Problem
                  Generator
                </h2>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setPracticeMode("single");
                        setAiProblem(null);
                      }}
                      className={`p-3 text-sm font-bold rounded-xl border-2 transition-all text-left ${
                        practiceMode === "single"
                          ? "border-purple-500 bg-purple-50 text-purple-800 shadow-sm"
                          : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                      }`}
                    >
                      Standard Minimization
                    </button>
                    <button
                      onClick={() => {
                        setPracticeMode("shared");
                        setAiProblem(null);
                        setUseDontCares(false);
                      }}
                      className={`p-3 text-sm font-bold rounded-xl border-2 transition-all text-left ${
                        practiceMode === "shared"
                          ? "border-purple-500 bg-purple-50 text-purple-800 shadow-sm"
                          : "border-slate-100 hover:border-slate-300 text-slate-500 bg-slate-50"
                      }`}
                    >
                      Logic Sharing (Multi-Output)
                    </button>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5 uppercase tracking-wide">
                      Variables
                    </label>
                    <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
                      {[3, 4].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setVarCount(num);
                            setAiProblem(null);
                          }}
                          className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${
                            varCount === num
                              ? "bg-white shadow-sm text-purple-700"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {num} Vars
                        </button>
                      ))}
                    </div>
                  </div>
                  {practiceMode === "single" && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-sm font-semibold text-slate-600">
                        Include Don't Cares (X)
                      </span>
                      <button
                        onClick={() => setUseDontCares(!useDontCares)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          useDontCares ? "bg-purple-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                            useDontCares ? "translate-x-6" : ""
                          }`}
                        />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={generateProblem}
                    disabled={status === "generating"}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-70 transform active:scale-95"
                  >
                    {status === "generating" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                    {status === "generating"
                      ? "Generating..."
                      : "Generate New Problem"}
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-500" /> Exam / Slide
                  Practice
                </h2>
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {SLIDE_PROBLEMS.map((prob) => (
                    <button
                      key={prob.id}
                      onClick={() => selectSlideProblem(prob.id)}
                      className="p-3 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-100 rounded-xl text-left transition-all group"
                    >
                      <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">
                        {prob.label}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1 line-clamp-1 truncate">
                        Σm({prob.minterms.join(",")})
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Workspace Area */}
            <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 relative min-h-[600px] flex flex-col">
              {apiError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-200 flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
                  <XCircle className="w-5 h-5 shrink-0" /> {apiError}
                </div>
              )}

              {!aiProblem && status === "idle" ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center animate-in zoom-in-95 duration-500">
                  <div className="bg-white p-5 rounded-full shadow-sm border border-slate-100 mb-5 relative">
                    <div className="absolute inset-0 bg-purple-200 rounded-full animate-ping opacity-20"></div>
                    <Layers className="w-12 h-12 text-indigo-400 relative z-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-700 tracking-tight">
                    Ready to Practice?
                  </h3>
                  <p className="mt-3 text-base text-slate-500 max-w-sm">
                    Generate a random AI problem or pick a specific Lecture 5
                    Exam Example from the sidebar to begin.
                  </p>
                </div>
              ) : status === "generating" ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-5 animate-in fade-in">
                  <div className="relative">
                    <Loader2 className="w-14 h-14 animate-spin text-purple-400" />
                    <Sparkles className="w-6 h-6 text-indigo-400 absolute -top-2 -right-2 animate-pulse" />
                  </div>
                  <p className="animate-pulse font-bold text-lg text-slate-600">
                    AI is crafting your problem...
                  </p>
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Problem Header Info */}
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      {aiProblem.source === "slide" ? (
                        <FileText className="text-indigo-500 w-6 h-6" />
                      ) : (
                        <Sparkles className="text-purple-500 w-6 h-6" />
                      )}
                      {aiProblem.source === "slide"
                        ? "Slide Example Selected"
                        : "AI Generated Problem"}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        Vars: {aiProblem.varNames}
                      </span>
                    </div>
                  </div>

                  {/* Settings Toggle Bar */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Question Style:
                      </span>
                      <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <button
                          onClick={() => setProblemFormat("minterms")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            problemFormat === "minterms"
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Σm Notation
                        </button>
                        <button
                          onClick={() => setProblemFormat("formula")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            problemFormat === "formula"
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Algebraic
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2 md:pl-0 pr-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        View Mode:
                      </span>
                      <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <button
                          onClick={() => setViewMode("kmap")}
                          className={`px-3 py-1 flex items-center gap-1.5 text-xs font-bold rounded-md transition-all ${
                            viewMode === "kmap"
                              ? "bg-purple-50 text-purple-700"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <Grid3X3 className="w-3.5 h-3.5" /> Map
                        </button>
                        <button
                          onClick={() => setViewMode("table")}
                          className={`px-3 py-1 flex items-center gap-1.5 text-xs font-bold rounded-md transition-all ${
                            viewMode === "table"
                              ? "bg-purple-50 text-purple-700"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <Table2 className="w-3.5 h-3.5" /> Table
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Render Problem Statement dynamically */}
                  <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Problem Statement
                    </h3>
                    {aiProblem.mode === "single" ? (
                      <div className="text-lg font-mono text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        {problemFormat === "minterms" ? (
                          <>
                            F({aiProblem.varNames}) = Σm(
                            {aiProblem.data.minterms.join(", ")})
                            {aiProblem.data.dont_cares?.length > 0 &&
                              ` + d(${aiProblem.data.dont_cares.join(", ")})`}
                          </>
                        ) : (
                          `F(${aiProblem.varNames}) = ${generateCanonicalSOP(
                            aiProblem.vars,
                            aiProblem.varNames,
                            aiProblem.data.minterms
                          )}`
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm md:text-base">
                        <div>
                          f({aiProblem.varNames}) ={" "}
                          {problemFormat === "minterms"
                            ? `Σm(${aiProblem.data.f_minterms.join(", ")})`
                            : generateCanonicalSOP(
                                aiProblem.vars,
                                aiProblem.varNames,
                                aiProblem.data.f_minterms
                              )}
                        </div>
                        <div>
                          g({aiProblem.varNames}) ={" "}
                          {problemFormat === "minterms"
                            ? `Σm(${aiProblem.data.g_minterms.join(", ")})`
                            : generateCanonicalSOP(
                                aiProblem.vars,
                                aiProblem.varNames,
                                aiProblem.data.g_minterms
                              )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main Visualizer (KMap or Truth Table) */}
                  <div className="flex justify-center my-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                    {viewMode === "kmap" ? (
                      <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
                        {aiProblem.mode === "single" ? (
                          <KMapRender
                            vars={aiProblem.vars}
                            varNames={aiProblem.varNames}
                            title={`K-Map for F`}
                            {...generateGrid(
                              aiProblem.vars,
                              aiProblem.data.minterms,
                              aiProblem.data.dont_cares
                            )}
                          />
                        ) : (
                          <>
                            <KMapRender
                              vars={aiProblem.vars}
                              varNames={aiProblem.varNames}
                              title="Map of f"
                              {...generateGrid(
                                aiProblem.vars,
                                aiProblem.data.f_minterms
                              )}
                            />
                            <KMapRender
                              vars={aiProblem.vars}
                              varNames={aiProblem.varNames}
                              title="Map of g"
                              {...generateGrid(
                                aiProblem.vars,
                                aiProblem.data.g_minterms
                              )}
                            />
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="w-full max-w-xl">
                        <TruthTableRender
                          vars={aiProblem.vars}
                          varNames={aiProblem.varNames}
                          mintermsF={
                            aiProblem.mode === "single"
                              ? aiProblem.data.minterms
                              : aiProblem.data.f_minterms
                          }
                          dontCaresF={
                            aiProblem.mode === "single"
                              ? aiProblem.data.dont_cares || []
                              : []
                          }
                          mintermsG={
                            aiProblem.mode === "shared"
                              ? aiProblem.data.g_minterms
                              : null
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Input & Evaluation Area */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-auto">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                      Your Answer
                    </h3>

                    {aiProblem.mode === "single" ? (
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-700">
                          Fully Minimized SOP for F:
                        </label>
                        <input
                          type="text"
                          value={userAnswerF}
                          onChange={(e) => setUserAnswerF(e.target.value)}
                          placeholder="e.g. A'B + CD'"
                          className="w-full p-4 border-2 border-slate-200 rounded-xl font-mono text-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                          disabled={status === "evaluating"}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">
                              Minimized f:
                            </label>
                            <input
                              type="text"
                              value={userAnswerF}
                              onChange={(e) => setUserAnswerF(e.target.value)}
                              placeholder="e.g. A'B + C"
                              className="w-full p-3 border-2 border-slate-200 rounded-xl font-mono focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition-all"
                              disabled={status === "evaluating"}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">
                              Minimized g:
                            </label>
                            <input
                              type="text"
                              value={userAnswerG}
                              onChange={(e) => setUserAnswerG(e.target.value)}
                              placeholder="e.g. AB' + C"
                              className="w-full p-3 border-2 border-slate-200 rounded-xl font-mono focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition-all"
                              disabled={status === "evaluating"}
                            />
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                          <label className="text-sm font-bold text-purple-800 block mb-2 flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Identify the Shared
                            Logic Term:
                          </label>
                          <input
                            type="text"
                            value={userAnswerShared}
                            onChange={(e) =>
                              setUserAnswerShared(e.target.value)
                            }
                            placeholder="e.g. C"
                            className="w-full p-3 border-2 border-purple-200 rounded-xl font-mono focus:border-purple-500 focus:ring-4 focus:ring-purple-50 transition-all"
                            disabled={status === "evaluating"}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-6">
                      {!aiFeedback ? (
                        <button
                          onClick={evaluateAnswer}
                          disabled={
                            status === "evaluating" ||
                            (aiProblem.mode === "single"
                              ? !userAnswerF
                              : !userAnswerF ||
                                !userAnswerG ||
                                !userAnswerShared)
                          }
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                          {status === "evaluating" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                          {status === "evaluating"
                            ? "Grading..."
                            : "Submit Answer"}
                        </button>
                      ) : (
                        <div
                          className={`p-6 rounded-2xl border-2 animate-in zoom-in-95 duration-300 ${
                            aiFeedback.is_correct
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-rose-50 border-rose-200"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`p-2 rounded-full mt-1 shrink-0 ${
                                aiFeedback.is_correct
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-rose-100 text-rose-600"
                              }`}
                            >
                              {aiFeedback.is_correct ? (
                                <CheckCircle2 className="w-8 h-8" />
                              ) : (
                                <XCircle className="w-8 h-8" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4
                                className={`text-xl font-black mb-2 ${
                                  aiFeedback.is_correct
                                    ? "text-emerald-800"
                                    : "text-rose-800"
                                }`}
                              >
                                {aiFeedback.is_correct
                                  ? "Brilliant Work!"
                                  : "Not Quite There."}
                              </h4>
                              <p className="text-slate-700 leading-relaxed mb-4">
                                {aiFeedback.feedback}
                              </p>

                              <div
                                className={`p-4 rounded-xl border font-mono font-bold text-lg ${
                                  aiFeedback.is_correct
                                    ? "bg-emerald-100/50 border-emerald-200 text-emerald-900"
                                    : "bg-white border-slate-200 text-slate-800"
                                }`}
                              >
                                <span className="text-xs uppercase tracking-wider text-slate-500 block mb-1 font-sans">
                                  Correct Minimal SOP:
                                </span>
                                {aiFeedback.correct_solution}
                              </div>

                              <button
                                onClick={
                                  aiProblem.source === "ai"
                                    ? generateProblem
                                    : () => {
                                        setAiFeedback(null);
                                        setUserAnswerF("");
                                      }
                                }
                                className={`mt-5 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                                  aiFeedback.is_correct
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-slate-800 hover:bg-slate-900 text-white"
                                }`}
                              >
                                {aiProblem.source === "ai" ? (
                                  <>
                                    <ArrowRight className="w-4 h-4" /> Next
                                    Problem
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4" /> Try Again
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CUSTOM FOOTER */}
        <footer className="text-center text-xs text-slate-400 mt-12 pb-4">
          Built with React, powered by the Gemini AI API.
          <br />
          Developed by Kiarash.
        </footer>
      </div>
    </div>
  );
}
