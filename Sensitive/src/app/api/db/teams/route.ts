import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Team from '@/models/Team';

export async function GET() {
  try {
    await connectDB();
    const teams = await Team.find({});
    return NextResponse.json(teams);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (Array.isArray(body)) {
      await Team.deleteMany({});
      if (body.length > 0) {
        await Team.insertMany(body.map(t => ({
          teamId: t.id,
          name: t.name,
          maxMembers: t.maxMembers,
          minMembers: t.minMembers || 1,
          memberIds: t.memberIds,
          groupId: t.groupId || 'default',
        })));
      }
      return NextResponse.json({ synced: body.length });
    }

    const team = await Team.create({
      teamId: body.id, name: body.name,
      maxMembers: body.maxMembers, minMembers: body.minMembers || 1,
      memberIds: body.memberIds,
    });
    return NextResponse.json(team);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { id } = await req.json();
    await Team.findOneAndDelete({ teamId: id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
