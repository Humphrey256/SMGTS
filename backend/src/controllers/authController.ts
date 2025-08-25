import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ message: 'Missing fields' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ email, password, role });
    const token = generateToken(user._id.toString(), user.role);
    res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user._id.toString(), user.role);
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}
