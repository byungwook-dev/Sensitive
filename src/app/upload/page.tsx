'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { cleanUploadedData, cleanedToStudents } from '@/services/dataCleanup';
import { CleanedStudent, UploadedRow, PersonalityType, Gender } from '@/types';
import * as XLSX from 'xlsx';

const ALL_PERSONALITIES: PersonalityType[] = ['리더형', '협동형', '분석형', '신중형', '적극형', '창의형'];

export default function UploadPage() {
  const { addStudent, setStudents, setTeams, students } = useStore();
  const [rawData, setRawData] = useState<UploadedRow[]>([]);
  const [cleanedData, setCleanedData] = useState<CleanedStudent[]>([]);
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('시트를 찾을 수 없습니다');
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<UploadedRow>(sheet);
      if (!data || data.length === 0) throw new Error('데이터가 비어있습니다');

      setRawData(data);

      // AI API로 데이터 정리 시도, 실패 시 로컬 폴백
      let cleaned;
      let usedAI = false;
      try {
        const res = await fetch('/api/ai/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: data }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.cleaned && Array.isArray(result.cleaned) && result.cleaned.length > 0) {
            cleaned = result.cleaned.map((item: { cleaned: Record<string, unknown>; warnings: string[]; needsReview: boolean }, idx: number) => ({
              original: data[idx] || {},
              cleaned: { ...item.cleaned, id: `upload-${idx + 1}` },
              warnings: item.warnings || [],
              needsReview: item.needsReview || false,
            }));
            usedAI = true;
          } else {
            throw new Error('Empty result');
          }
        } else {
          throw new Error('API error');
        }
      } catch {
        cleaned = cleanUploadedData(data);
      }
      if (!cleaned || cleaned.length === 0) {
        cleaned = cleanUploadedData(data);
      }
      setCleanedData(cleaned);
      setStep('review');
      if (!usedAI) {
        alert('AI API 연결 실패로 로컬 엔진으로 정리했습니다. 결과를 확인해주세요.');
      }
    } catch (err) {
      alert(`파일 처리 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}. Excel(.xlsx) 또는 CSV 파일을 확인해주세요.`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const [saveMode, setSaveMode] = useState<'ask' | 'new' | 'append' | null>(null);

  const handleSave = () => {
    if (students.length > 0 && saveMode === null) {
      setSaveMode('ask');
      return;
    }
    const newStudents = cleanedToStudents(cleanedData);
    newStudents.forEach((s) => {
      s.id = `imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    });

    if (saveMode === 'new') {
      // 새 파일: 기존 학생 전부 교체, 팀 초기화
      setStudents(newStudents);
      setTeams([]);
    } else {
      // 기존에 추가
      newStudents.forEach((s) => addStudent(s));
    }
    setSaveMode(null);
    setStep('done');
  };

  const updateCleanedField = (index: number, field: string, value: string | number) => {
    setCleanedData((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newCleaned = { ...item.cleaned, [field]: value };
        // 경고 재검사
        const warnings: string[] = [];
        if (!newCleaned.name) warnings.push('이름이 누락되었습니다');
        if (!newCleaned.gender) warnings.push('성별이 누락되었습니다');
        if (!newCleaned.age) warnings.push('나이가 누락되었습니다');
        if (newCleaned.score === undefined) warnings.push('성적이 누락되었습니다');
        if (!newCleaned.personality) warnings.push('성격 유형이 누락되었습니다');
        return { ...item, cleaned: newCleaned, warnings, needsReview: warnings.length > 0 };
      })
    );
  };

  const reviewCount = cleanedData.filter((c) => c.needsReview).length;
  const validCount = cleanedData.filter((c) => !c.needsReview).length;

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <>
          {/* Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-20 transition-colors hover:border-blue-400 hover:bg-blue-50/30"
          >
            {isProcessing ? (
              <>
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-semibold text-slate-700">AI가 데이터를 분석하고 있습니다...</p>
                <p className="mt-1 text-xs text-slate-400">컬럼 매핑, 값 표준화, 성격 유형 분류 중</p>
              </>
            ) : (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">Excel 또는 CSV 파일을 드래그하여 업로드</p>
                <p className="mt-1 text-xs text-slate-400">또는 아래 버튼으로 파일을 선택하세요</p>
                <div className="mt-5 flex items-center gap-3">
                  <label className="cursor-pointer rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]">
                    파일 선택
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </label>
                  <a href="/template.xlsx" download className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                    양식 다운로드
                  </a>
                </div>
              </>
            )}
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">AI 데이터 정리 프로세스</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { num: '1', title: '파일 업로드', desc: 'Excel/CSV 파일을 업로드합니다' },
                { num: '2', title: 'AI 분석', desc: '컬럼명 해석, 값 표준화, 성격/성향 분류' },
                { num: '3', title: '관리자 검수', desc: '정리된 데이터를 확인하고 수정합니다' },
                { num: '4', title: '저장', desc: '검수 완료 후 학생 목록에 추가합니다' },
              ].map((s) => (
                <div key={s.num} className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">{s.num}</div>
                  <p className="text-xs font-semibold text-slate-700">{s.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 특이사항 안내 */}
          <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50/50 to-purple-50/50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">특이사항을 적으면 AI가 배정에 반영합니다</h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  엑셀의 특이사항(비고) 칸에 학생의 상황을 자유롭게 적어주세요. AI가 내용을 이해하고 팀 배정 시 가장 적합한 팀원과 매칭합니다.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { example: '"지체장애"', result: '배려심 있는 협동형 학생과 매칭' },
                    { example: '"영어를 못함"', result: '영어 잘하는 학생과 같은 팀' },
                    { example: '"ADHD"', result: '차분한 신중형 학생과 매칭' },
                    { example: '"소심하고 왕따 경험"', result: '사교적/외향적 학생과 매칭' },
                  ].map((item) => (
                    <div key={item.example} className="flex items-start gap-2 text-[11px]">
                      <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 font-semibold text-violet-700">{item.example}</span>
                      <span className="text-slate-500">→ {item.result}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">어떤 내용이든 자유롭게 작성하세요. AI가 맥락을 이해하고 최선의 배정을 합니다.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          {/* Status Bar */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-sm font-semibold text-slate-700">{fileName}</span>
            </div>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">총 {cleanedData.length}행</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{validCount}건 정상</span>
            {reviewCount > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{reviewCount}건 검수 필요</span>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={() => { setStep('upload'); setRawData([]); setCleanedData([]); }} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">다시 업로드</button>
              <button onClick={handleSave} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                {validCount}명 저장하기
              </button>
            </div>
          </div>

          {/* 저장 방식 선택 */}
          {saveMode === 'ask' && (
            <div className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-5 shadow-md">
              <p className="text-sm font-bold text-slate-900 mb-3">현재 {students.length}명의 학생이 있습니다. 어떻게 저장할까요?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setSaveMode('new'); setTimeout(() => handleSave(), 0); }}
                  className="flex-1 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <p className="text-sm font-bold text-slate-800">새 파일로 교체</p>
                  <p className="mt-1 text-xs text-slate-500">기존 학생을 모두 삭제하고 새 데이터로 교체합니다</p>
                </button>
                <button
                  onClick={() => { setSaveMode('append'); setTimeout(() => handleSave(), 0); }}
                  className="flex-1 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
                >
                  <p className="text-sm font-bold text-slate-800">기존 데이터에 추가</p>
                  <p className="mt-1 text-xs text-slate-500">기존 {students.length}명에 {validCount}명을 추가합니다</p>
                </button>
              </div>
              <button onClick={() => setSaveMode(null)} className="mt-3 text-xs text-slate-400 hover:text-slate-600">취소</button>
            </div>
          )}

          {/* Original Data Preview */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">원본 데이터 미리보기</h4>
            </div>
            <div className="max-h-48 overflow-auto p-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    {rawData.length > 0 && Object.keys(rawData[0]).map((key) => (
                      <th key={key} className="px-3 py-2 text-left font-semibold text-slate-500">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-1.5 text-slate-600">{String(val ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rawData.length > 5 && <p className="p-3 text-center text-xs text-slate-400">...외 {rawData.length - 5}행</p>}
            </div>
          </div>

          {/* Cleaned Data Table (Editable) */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">AI 정리 결과 (수정 가능)</h4>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">상태</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">이름</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">성별</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">나이</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">성격 유형</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">성적</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">비고</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">경고</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanedData.map((item, idx) => (
                    <tr key={idx} className={`border-t border-slate-50 ${item.needsReview ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-2">
                        {item.needsReview ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                          </span>
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input className="w-full rounded border border-slate-200 px-2 py-1 text-sm" value={item.cleaned.name || ''} onChange={(e) => updateCleanedField(idx, 'name', e.target.value)} />
                      </td>
                      <td className="px-4 py-2">
                        <select className="rounded border border-slate-200 px-2 py-1 text-sm" value={item.cleaned.gender || ''} onChange={(e) => updateCleanedField(idx, 'gender', e.target.value)}>
                          <option value="">-</option><option value="남">남</option><option value="여">여</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" className="w-16 rounded border border-slate-200 px-2 py-1 text-sm" value={item.cleaned.age || ''} onChange={(e) => updateCleanedField(idx, 'age', parseInt(e.target.value))} />
                      </td>
                      <td className="px-4 py-2">
                        <select className="rounded border border-slate-200 px-2 py-1 text-sm" value={item.cleaned.personality || ''} onChange={(e) => updateCleanedField(idx, 'personality', e.target.value)}>
                          <option value="">-</option>
                          {ALL_PERSONALITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" className="w-16 rounded border border-slate-200 px-2 py-1 text-sm" value={item.cleaned.score ?? ''} onChange={(e) => updateCleanedField(idx, 'score', parseInt(e.target.value))} />
                      </td>
                      <td className="px-4 py-2">
                        <input className="w-full rounded border border-slate-200 px-2 py-1 text-sm" value={item.cleaned.note || ''} onChange={(e) => updateCleanedField(idx, 'note', e.target.value)} />
                      </td>
                      <td className="px-4 py-2">
                        {item.warnings.length > 0 && (
                          <div className="space-y-0.5">
                            {item.warnings.map((w, wi) => (
                              <p key={wi} className="text-[11px] text-amber-600">{w}</p>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-lg font-bold text-slate-900">데이터 저장 완료!</p>
          <p className="mt-1 text-sm text-slate-500">총 {students.length}명의 학생이 등록되어 있습니다</p>
          <div className="mt-6 flex gap-3">
            <button onClick={() => { setStep('upload'); setRawData([]); setCleanedData([]); }} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
              추가 업로드
            </button>
            <a href="/students" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              학생 목록 보기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
