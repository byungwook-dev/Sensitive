import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/models/Student';
import Team from '@/models/Team';
import mongoose from 'mongoose';

// 설정/프리셋/그룹 등을 저장할 범용 컬렉션
async function getSettingsCollection() {
  const db = mongoose.connection.db;
  return db!.collection('settings');
}

// DB에서 전체 데이터 불러오기
export async function GET() {
  try {
    await connectDB();
    const students = await Student.find({}).lean();
    const teams = await Team.find({}).lean();
    const settings = await getSettingsCollection();
    const config = await settings.findOne({ key: 'appConfig' });

    return NextResponse.json({
      students: students.map(s => ({
        id: s.studentId, name: s.name, gender: s.gender, age: s.age,
        personality: s.personality, trait: s.trait, score: s.score, note: s.note,
      })),
      teams: teams.map(t => ({
        id: t.teamId, name: t.name, maxMembers: t.maxMembers,
        minMembers: t.minMembers, memberIds: t.memberIds,
      })),
      presets: config?.presets || [],
      studentGroups: config?.studentGroups || [],
      balanceWeights: config?.balanceWeights || { score: 30, personality: 26, trait: 26, gender: 10, age: 4, size: 4 },
      scoreSystem: config?.scoreSystem || 'score100',
      customMax: config?.customMax || 100,
      teamAnalyses: config?.teamAnalyses || {},
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 전체 데이터를 DB에 저장
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { students, teams, presets, studentGroups, balanceWeights, scoreSystem, customMax, teamAnalyses } = await req.json();

    // 학생 동기화
    if (students) {
      await Student.deleteMany({});
      if (students.length > 0) {
        await Student.insertMany(students.map((s: Record<string, unknown>) => ({
          studentId: s.id, name: s.name, gender: s.gender, age: s.age,
          personality: s.personality, trait: s.trait, score: s.score, note: s.note || '',
        })));
      }
    }

    // 팀 동기화
    if (teams) {
      await Team.deleteMany({});
      if (teams.length > 0) {
        await Team.insertMany(teams.map((t: Record<string, unknown>) => ({
          teamId: t.id, name: t.name, maxMembers: t.maxMembers,
          minMembers: t.minMembers || 1, memberIds: t.memberIds,
        })));
      }
    }

    // 설정/프리셋/그룹/가중치/분석 저장
    const settings = await getSettingsCollection();
    await settings.updateOne(
      { key: 'appConfig' },
      {
        $set: {
          key: 'appConfig',
          presets: presets || [],
          studentGroups: studentGroups || [],
          balanceWeights: balanceWeights || { score: 30, personality: 26, trait: 26, gender: 10, age: 4, size: 4 },
          scoreSystem: scoreSystem || 'score100',
          customMax: customMax || 100,
          teamAnalyses: teamAnalyses || {},
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      synced: true,
      students: students?.length || 0,
      teams: teams?.length || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
