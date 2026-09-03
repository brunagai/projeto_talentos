export const HARD_SKILL_KEYS = [
  "Aprendizagem autodirigida e contínua",
  "Gestão de Processos",
  "Metodologia Ágil",
  "Gestão de projetos",
  "Excel",
  "SQL",
  "Databricks",
  "Python",
  "Machine Learning",
  "Postgree",
  "IA Gen",
  "Prompt engineering",
] as const;

export const SOFT_SKILL_KEYS = [
  "Ética",
  "Pensamento crítico",
  "Relacionamento interpessoal",
  "Comunicação (escuta ativa e oratória)",
  "Resolução de problemas",
  "Gestão de tempo",
  "Inteligência Emocional",
  "Empatia",
] as const;

export const ALL_SKILL_KEYS = [...HARD_SKILL_KEYS, ...SOFT_SKILL_KEYS] as const;

export function skillsVazias(): Record<string, number> {
  return Object.fromEntries(ALL_SKILL_KEYS.map((nome) => [nome, 3]));
}

export function separarSkills(skills: Record<string, number>): {
  hard_skills: Record<string, number>;
  soft_skills: Record<string, number>;
} {
  const hard_skills: Record<string, number> = {};
  const soft_skills: Record<string, number> = {};
  for (const nome of HARD_SKILL_KEYS) {
    hard_skills[nome] = skills[nome] ?? 0;
  }
  for (const nome of SOFT_SKILL_KEYS) {
    soft_skills[nome] = skills[nome] ?? 0;
  }
  return { hard_skills, soft_skills };
}
