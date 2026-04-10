import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { name: string; email: string; organization: string };
    return NextResponse.json({ user: { name: decoded.name, email: decoded.email, organization: decoded.organization } });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

// 로그아웃
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', { maxAge: 0, path: '/' });
  return response;
}
