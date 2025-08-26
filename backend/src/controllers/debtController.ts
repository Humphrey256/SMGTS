import { Request, Response } from 'express';
import { Debt } from '../models/Debt.js';
import { AuthRequest } from '../middleware/auth.js';

export async function createDebt(req: AuthRequest, res: Response) {
  try {
    const { title, amount, reason } = req.body;
    const debt = await Debt.create({ title, amount, reason, issuer: req.user!._id });
    res.status(201).json(debt);
  } catch (err) {
    res.status(400).json({ message: 'Invalid debt data' });
  }
}

export async function listDebts(req: AuthRequest, res: Response) {
  const filter = req.user!.role === 'admin' ? {} : { issuer: req.user!._id };
  const debts = await Debt.find(filter).populate('issuer').sort('-createdAt');
  res.json(debts);
}

export async function updateDebtStatus(req: AuthRequest, res: Response) {
  const { status } = req.body;
  // allow only accepted status values
  if (!['Pending', 'Paid'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }
  const debt = await Debt.findById(req.params.id);
  if (!debt) return res.status(404).json({ message: 'Not found' });

  // Allow update if user is admin OR the issuer (creator) of the debt
  const isAdmin = req.user!.role === 'admin';
  const isIssuer = debt.issuer && debt.issuer.equals ? debt.issuer.equals(req.user!._id) : String(debt.issuer) === String(req.user!._id);
  if (!isAdmin && !isIssuer) return res.status(403).json({ message: 'Forbidden' });

  debt.status = status;
  await debt.save();
  res.json(debt);
}
