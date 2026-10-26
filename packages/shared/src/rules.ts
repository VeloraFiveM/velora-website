import { z } from "zod";
export const defaultRuleGroups: {category:string;items:[string,string][]}[] = [
  {
    category: "Community conduct",
    items: [
      [
        "Respect the people behind the characters",
        "Treat every player with respect. Harassment, discrimination, threats, and sharing personal information have no place in Velora.",
      ],
      [
        "Keep the community fair",
        "Do not exploit bugs, cheat, or use third-party tools to gain an unfair advantage. Report problems privately to staff.",
      ],
    ],
  },
  {
    category: "Roleplay fundamentals",
    items: [
      [
        "Let the story breathe",
        "Give other players a fair opportunity to participate. Keep in-character conflict separate from out-of-character relationships.",
      ],
      [
        "Play with what your character knows",
        "Do not use information from streams, Discord, or other out-of-character sources to influence your character’s decisions.",
      ],
      [
        "Value your character’s life",
        "Respond to danger with believable care for your character and those around them.",
      ],
    ],
  },
  {
    category: "Support and reports",
    items: [
      [
        "Resolve issues through support",
        "Keep disputes out of public channels. Provide clear context and available evidence when asking staff for help.",
      ],
    ],
  },
];
export const rulesPageSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(1000),
    notice: z.string().trim().max(1000),
    groups: z
      .array(
        z.object({
          category: z.string().trim().min(1).max(100),
          items: z
            .array(
              z.tuple([
                z.string().trim().min(1).max(200),
                z.string().trim().min(1).max(10000),
              ]),
            )
            .min(1)
            .max(100),
        }),
      )
      .min(1)
      .max(50),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.groups.map((g) => g.category.toLowerCase())).size ===
      v.groups.length,
    "Category names must be unique",
  );
export type RulesPage = z.infer<typeof rulesPageSchema>;
export const defaultRulesPage: RulesPage = {
  title: "Community rules.",
  description: "A shared foundation for the stories we create together.",
  notice:
    "Proposed community guidelines · These starter guidelines need owner review before becoming official server rules.",
  groups: defaultRuleGroups,
};
