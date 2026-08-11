import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware/errorHandler.middleware.js";

export const ticketRouter = Router();

const CreateTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(1).max(5000),
});

ticketRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const { subject, message } = CreateTicketSchema.parse(req.body);
    const ticket = await prisma.ticket.create({
      data: {
        userId: req.user!.id,
        subject,
        messages: { create: { authorRole: "USER", body: message } },
      },
      include: { messages: true },
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
});

ticketRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
});

const ReplySchema = z.object({ message: z.string().min(1).max(5000) });

/// The session user must own the ticket, or be an admin.
ticketRouter.post("/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const { message } = ReplySchema.parse(req.body);
    const ticketId = req.params.id;
    if (!ticketId) throw new HttpError(400, "Missing ticket id");
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new HttpError(404, "Ticket not found");
    if (ticket.userId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "Not your ticket");
    }
    const authorRole =
      req.user!.role === "ADMIN" && ticket.userId !== req.user!.id
        ? "ADMIN"
        : "USER";
    const created = await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorRole, body: message },
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});
