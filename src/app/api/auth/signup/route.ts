import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, password, organization } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: '이름, 이메일, 비밀번호를 모두 입력해주세요' }, { status: 400 });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed, organization: organization || '' });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
