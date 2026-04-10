import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/models/Student';

// 전체 학생 조회
export async function GET() {
  try {
    await connectDB();
    const students = await Student.find({}).sort({ createdAt: -1 });
    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 학생 추가 / 전체 동기화
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // 배열이면 전체 동기화 (기존 삭제 후 새로 삽입)
    if (Array.isArray(body)) {
      await Student.deleteMany({});
      if (body.length > 0) {
        await Student.insertMany(body.map(s => ({
          studentId: s.id,
          name: s.name,
          gender: s.gender,
          age: s.age,
          personality: s.personality,
          trait: s.trait,
          score: s.score,
          note: s.note || '',
          groupId: s.groupId || 'default',
        })));
      }
      return NextResponse.json({ synced: body.length });
    }

    // 단일 학생 추가
    const student = await Student.create({
      studentId: body.id,
      name: body.name,
      gender: body.gender,
      age: body.age,
      personality: body.personality,
      trait: body.trait,
      score: body.score,
      note: body.note || '',
    });
    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 학생 수정
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    await Student.findOneAndUpdate({ studentId: body.id }, {
      name: body.name, gender: body.gender, age: body.age,
      personality: body.personality, trait: body.trait,
      score: body.score, note: body.note,
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 학생 삭제
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { id } = await req.json();
    await Student.findOneAndDelete({ studentId: id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
