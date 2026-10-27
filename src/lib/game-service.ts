import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { publicLearningWhere, LearningError } from "@/lib/learning-service";
import { gradeQuestions, type ResourceBody } from "@/lib/learning-contract";
import { assertAccountRateLimit } from "@/lib/account-security";
const Request = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), resourceId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("join"), code: z.string().trim().toUpperCase().regex(/^[A-F0-9]{10}$/), resourceId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("start"), roomId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("submit"), roomId: z.string().uuid(), answers: z.record(z.number().int().min(-1).max(7)) }).strict(),
]);
export async function mutateGame(userId: string, input: unknown) {
  const data = Request.parse(input);
  await assertAccountRateLimit(userId, "games", 30, 60000);
  if (data.action === "create") {
    const resource = await prisma.learningResource.findFirst({ where: { id: data.resourceId, kind: "game", ...publicLearningWhere } });
    if (!resource) throw new LearningError(404, "Choose a published game.");
    if (!(resource.body as ResourceBody).questions.length) throw new LearningError(409, "This game has no questions.");
    const room = await prisma.gameRoom.create({ data: { code: randomBytes(5).toString("hex").toUpperCase(), resourceId: resource.id, resourceVersion: resource.version, hostId: userId, expiresAt: new Date(Date.now() + 15 * 60000), players: { create: { userId, alias: "Player 1" } } } });
    return readGame(userId, room.id);
  }
  const id = data.action === "join" ? (await prisma.gameRoom.findUnique({ where: { code: data.code }, select: { id: true } }))?.id : data.roomId;
  if (!id) throw new LearningError(404, "Challenge not found. Check the invitation code.");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM game_rooms WHERE id = ${id} FOR UPDATE`;
    const room = await tx.gameRoom.findUnique({ where: { id }, include: { players: true, resource: true } });
    if (!room || room.expiresAt <= new Date()) throw new LearningError(410, "This invitation expired. Create a new challenge.");
    if (room.resource.status !== "published" || room.resource.consentScope !== "public_excerpt" || room.resource.restrictionLevel !== "public" || room.resource.version !== room.resourceVersion) throw new LearningError(409, "The game changed or was withdrawn. Start a new challenge.");
    const player = room.players.find(item => item.userId === userId);
    if (data.action === "join") {
      if (data.resourceId !== room.resourceId) throw new LearningError(409, "That invitation belongs to a different game.");
      if (player) return;
      if (room.status !== "waiting") throw new LearningError(409, "This challenge already started.");
      if (room.players.length >= 8) throw new LearningError(409, "This challenge is full.");
      await tx.gamePlayer.create({ data: { roomId: id, userId, alias: `Player ${room.players.length + 1}` } });
    } else if (!player) throw new LearningError(403, "Join this challenge before continuing.");
    else if (data.action === "start") {
      if (room.hostId !== userId || room.status !== "waiting") throw new LearningError(403, "Only the host can start a waiting challenge.");
      if (room.players.length < 2) throw new LearningError(409, "Invite another player before starting.");
      await tx.gameRoom.update({ where: { id }, data: { status: "active", startsAt: new Date(), expiresAt: new Date(Math.max(room.expiresAt.getTime(),Date.now()+((room.resource.body as ResourceBody).timeLimit || 120)*1000+300000)) } });
    } else {
      const body = room.resource.body as ResourceBody;
      if (room.status !== "active" || !room.startsAt || Date.now() >= room.startsAt.getTime() + (body.timeLimit || 120) * 1000) throw new LearningError(409, "The answering window has ended.");
      if (player.submittedAt) throw new LearningError(409, "Your answers have already been submitted.");
      if (Object.keys(data.answers).some(key => !body.questions.some(question => question.id === key)) || body.questions.some(question => !Object.hasOwn(data.answers, question.id))) throw new LearningError(400, "Answer every challenge question.");
      const grade = gradeQuestions(body, data.answers);
      await tx.gamePlayer.update({ where: { id: player.id }, data: { answers: data.answers, score: grade.score, submittedAt: new Date() } });
      // Atomic conflict update preserves the best result when practice and a
      // multiplayer submission arrive concurrently on different devices.
      await tx.$executeRaw`INSERT INTO learning_states (id,"userId","resourceId","resourceVersion","bestScore",attempts,completed,position,"updatedAt")
        VALUES (${randomUUID()},${userId},${room.resourceId},${room.resourceVersion},${grade.score},1,${grade.score >= 70},${body.text?.length || 0},NOW())
        ON CONFLICT ("userId","resourceId") DO UPDATE SET
          "bestScore"=CASE WHEN learning_states."resourceVersion"=EXCLUDED."resourceVersion" THEN GREATEST(learning_states."bestScore",EXCLUDED."bestScore") ELSE EXCLUDED."bestScore" END,
          attempts=CASE WHEN learning_states."resourceVersion"=EXCLUDED."resourceVersion" THEN learning_states.attempts+1 ELSE 1 END,
          completed=CASE WHEN learning_states."resourceVersion"=EXCLUDED."resourceVersion" THEN learning_states.completed OR EXCLUDED.completed ELSE EXCLUDED.completed END,
          position=CASE WHEN learning_states."resourceVersion"=EXCLUDED."resourceVersion" THEN GREATEST(learning_states.position,EXCLUDED.position) ELSE EXCLUDED.position END,
          "resourceVersion"=EXCLUDED."resourceVersion","updatedAt"=NOW()`;
      await tx.analyticsEvent.create({data:{eventType:"game_completed",userId,languageId:room.resource.languageId,entityType:"learning_resource",entityId:room.resourceId,metadata:{score:grade.score,mode:"battle"}}});
      if (room.players.every(item => item.id === player.id || item.submittedAt)) await tx.gameRoom.update({ where: { id }, data: { status: "finished" } });
    }
  });
  return readGame(userId, id);
}
export async function readGame(userId: string, id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new LearningError(400, "Choose a valid challenge.");
  const room = await prisma.gameRoom.findUnique({ where: { id }, include: { resource: true, players: { orderBy: { joinedAt: "asc" } } } });
  if (!room || room.expiresAt <= new Date()) throw new LearningError(410, "This challenge expired.");
  const player = room.players.find(item => item.userId === userId);
  if (!player) throw new LearningError(403, "Join this challenge before viewing it.");
  if (room.resource.status !== "published" || room.resource.consentScope !== "public_excerpt" || room.resource.restrictionLevel !== "public" || room.resource.version !== room.resourceVersion) throw new LearningError(409, "The game changed or was withdrawn.");
  const body = room.resource.body as ResourceBody;
  const deadline = room.startsAt ? room.startsAt.getTime() + (body.timeLimit || 120) * 1000 : null;
  const finished = room.status === "finished" || !!deadline && deadline <= Date.now();
  return { id: room.id, code: room.code, title: room.resource.title, host: room.hostId === userId, status: finished ? "finished" : room.status,
    deadline: deadline ? new Date(deadline).toISOString() : null, serverNow: new Date().toISOString(), submitted: !!player.submittedAt,
    players: room.players.map(item => ({ id: item.id, alias: item.alias, submitted: !!item.submittedAt, score: finished ? item.score ?? 0 : null })),
    questions: room.status !== "waiting" ? body.questions.map(question => ({ id: question.id, prompt: question.prompt, choices: question.choices, ...(finished ? { answer: question.answer, explanation: question.explanation } : {}) })) : [],
  };
}
