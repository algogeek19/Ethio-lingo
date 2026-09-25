import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Code,
  Film,
  Save,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { useStaking, CURRICULUM_LEVELS } from '../../context/StakingContext';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabaseClient';

const CurriculumManagement = () => {
  const { importQuestionBankJson } = useStaking();
  
  // Selected Level State
  const [selectedLevel, setSelectedLevel] = useState('Beginner I');
  const [selectedDay, setSelectedDay] = useState(1); // Day 1 to 30

  // CMS Sub-Tab: 'modules' | 'json'
  const [cmsTab, setCmsTab] = useState('modules');

  // Module Content State from API
  const [populatedDays, setPopulatedDays] = useState([]);
  const [selectedModulePdfFile, setSelectedModulePdfFile] = useState(null);
  const [isUploadingModulePdf, setIsUploadingModulePdf] = useState(false);
  const [activeDayForm, setActiveDayForm] = useState({
    lessonTitle: '',
    lessonVideoUrl: '',
    refGuideTitle: '',
    refGuideDescription: '',
    refGuideUrl: '',
    listeningInformativeUrl: '',
    listeningEntertainmentUrl: '',
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [moduleErrorMsg, setModuleErrorMsg] = useState('');

  // Bulk Question Bank JSON State
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonSuccess, setJsonSuccess] = useState('');

  const sampleQuestionJsonTemplate = [
    {
      question: 'She _____ to the library every day to study for her daily exam.',
      options: ['go', 'goes', 'going', 'gone'],
      answerIndex: 1,
      dayNumber: 1,
      level: 'Beginner I',
      keywords: 'present_simple, tenses',
    },
  ];

  // Fetch module content from API when level or day changes
  useEffect(() => {
    const loadCurriculumData = async () => {
      setModuleErrorMsg('');
      setSelectedModulePdfFile(null);
      try {
        const res = await api.getDailyWorkspace(selectedLevel, selectedDay);
        if (res.success && res.data) {
          const mod = res.data.module;
          // Check if this day is populated in DB (either via mod.isPopulated === true)
          if (mod && mod.isPopulated) {
            setActiveDayForm({
              lessonTitle: mod.title || '',
              lessonVideoUrl: mod.lessonVideoUrl || '',
              refGuideTitle: mod.refGuideTitle || '',
              refGuideDescription: mod.refGuideDescription || '',
              refGuideUrl: mod.refGuideUrl || '',
              listeningInformativeUrl: mod.listeningInformativeUrl || '',
              listeningEntertainmentUrl: mod.listeningEntertainmentUrl || '',
            });
          } else {
            // UNPOPULATED / DRAFT DAY: Leave ALL input boxes COMPLETELY EMPTY ('')!
            setActiveDayForm({
              lessonTitle: '',
              lessonVideoUrl: '',
              refGuideTitle: '',
              refGuideDescription: '',
              refGuideUrl: '',
              listeningInformativeUrl: '',
              listeningEntertainmentUrl: '',
            });
          }
        }
      } catch (err) {
        console.error('Error fetching curriculum data:', err);
      }
    };

    loadCurriculumData();
  }, [selectedLevel, selectedDay]);

  // Fetch list of populated module day numbers for the selected level
  useEffect(() => {
    const loadPopulatedDays = async () => {
      try {
        const res = await api.getPopulatedModules(selectedLevel);
        if (res.success && Array.isArray(res.data)) {
          setPopulatedDays(res.data);
        }
      } catch (err) {
        console.error('Error fetching populated module days:', err);
      }
    };
    loadPopulatedDays();
  }, [selectedLevel]);

  // Handle Day Selection Change
  const handleSelectDay = (dayNum) => {
    setSelectedDay(dayNum);
    setSelectedModulePdfFile(null);
    setSaveSuccessMsg('');
    setModuleErrorMsg('');
  };

  // Save Module Content for Selected Day via API with strict validation and PDF upload
  const handleSaveDayContent = async () => {
    setModuleErrorMsg('');
    setSaveSuccessMsg('');

    const {
      lessonTitle,
      lessonVideoUrl,
      refGuideTitle,
      refGuideDescription,
      refGuideUrl,
      listeningInformativeUrl,
      listeningEntertainmentUrl,
    } = activeDayForm;

    const hasPdfFile = !!selectedModulePdfFile || !!refGuideUrl;

    if (
      !lessonTitle.trim() ||
      !lessonVideoUrl.trim() ||
      !refGuideTitle.trim() ||
      !refGuideDescription.trim() ||
      !hasPdfFile ||
      !listeningInformativeUrl.trim() ||
      !listeningEntertainmentUrl.trim()
    ) {
      setModuleErrorMsg(`Please fill in all required task inputs AND upload a Reference PDF File before submitting ${selectedLevel} — Day ${selectedDay} tasks.`);
      return;
    }

    try {
      let finalRefPdfUrl = refGuideUrl || '';

      // Upload PDF file to Supabase Storage if a new PDF file was selected
      if (selectedModulePdfFile) {
        setIsUploadingModulePdf(true);
        const sanitizeName = selectedModulePdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const levelFolder = selectedLevel.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filePath = `references/${levelFolder}_day${selectedDay}_${Date.now()}_${sanitizeName}`;

        const { error: uploadErr } = await supabase.storage
          .from('curriculum-books')
          .upload(filePath, selectedModulePdfFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/pdf',
          });

        if (uploadErr) {
          throw new Error(`Supabase Reference PDF Upload Error: ${uploadErr.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('curriculum-books')
          .getPublicUrl(filePath);

        finalRefPdfUrl = publicUrlData.publicUrl;
      }

      const payload = {
        level: selectedLevel,
        dayNumber: selectedDay,
        title: lessonTitle.trim(),
        lessonVideoUrl: lessonVideoUrl.trim(),
        refGuideTitle: refGuideTitle.trim(),
        refGuideDescription: refGuideDescription.trim(),
        refGuideUrl: finalRefPdfUrl,
        listeningInformativeUrl: listeningInformativeUrl.trim(),
        listeningEntertainmentUrl: listeningEntertainmentUrl.trim(),
      };

      const res = await api.upsertModule(payload);
      if (res.success) {
        setActiveDayForm((prev) => ({ ...prev, refGuideUrl: finalRefPdfUrl }));
        setSelectedModulePdfFile(null);
        setIsUploadingModulePdf(false);
        setPopulatedDays((prev) => Array.from(new Set([...prev, selectedDay])));
        setSaveSuccessMsg(`Content & Reference PDF for ${selectedLevel} — Day ${selectedDay} saved successfully to database!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err) {
      setIsUploadingModulePdf(false);
      setModuleErrorMsg(`Error saving content: ${err.message}`);
    }
  };

  // Bulk Question JSON Import
  const handleJsonImport = async () => {
    try {
      setJsonError('');
      setJsonSuccess('');
      const parsed = JSON.parse(jsonInput);

      if (!Array.isArray(parsed)) {
        throw new Error('JSON format invalid: Root element must be an array `[...]` of question objects.');
      }

      const count = await importQuestionBankJson(parsed);
      setJsonSuccess(`Successfully imported ${count} question(s) into database question bank across Day 1 - Day 30!`);
      setJsonInput('');
    } catch (err) {
      setJsonError(err.message || 'Invalid JSON syntax or API error. Please check formatting.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 space-y-10 transition-colors duration-250">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline/50 pb-6">
        <div>
          <span className="mono-micro-label text-primary">CURRICULUM</span>
          <h1 className="font-cormorant text-4xl md:text-5xl font-normal text-on-surface mt-2">
            Curriculum Content & Question Bank Manager
          </h1>
          <p className="text-xs text-on-surface-variant mt-2">
            Manage daily lesson YouTube videos, reference PDF manuals, listening task URLs, and bulk import diagnostic exam questions across all 6 levels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="rounded-full bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high font-semibold text-xs tracking-wider uppercase px-5 py-2.5 transition-all focus-ring"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>

      {/* LEVEL SELECTION PILLS */}
      <div className="space-y-3">
        <label className="mono-micro-label text-on-surface-variant block">
          SELECT CURRICULUM LEVEL TO MANAGE (FREE TRIAL + 6 LEVELS)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
          {['Free Trial', ...CURRICULUM_LEVELS].map((lvl) => {
            const isSelected = selectedLevel === lvl;
            const moduleCount = lvl === 'Free Trial' ? '7 Modules' : '30 Modules';
            return (
              <button
                key={lvl}
                onClick={() => {
                  setSelectedLevel(lvl);
                  if (lvl === 'Free Trial' && selectedDay > 7) setSelectedDay(1);
                }}
                className={`py-3 px-3 rounded-full border text-xs font-semibold text-center transition-all focus-ring cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-on-primary border-primary shadow-sm font-bold'
                    : 'bg-surface-lowest text-on-surface border-hairline hover:border-primary'
                }`}
              >
                <div>{lvl}</div>
                <span className="text-[10px] font-mono opacity-80 block mt-0.5">{moduleCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CMS MAIN NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-hairline" role="tablist">
        <button
          role="tab"
          aria-selected={cmsTab === 'modules'}
          onClick={() => setCmsTab('modules')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring ${
            cmsTab === 'modules'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Film size={16} />
          <span>Daily Modules Editor (Day 1 - Day 30)</span>
        </button>

        <button
          role="tab"
          aria-selected={cmsTab === 'json'}
          onClick={() => setCmsTab('json')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring ${
            cmsTab === 'json'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Code size={16} />
          <span>Bulk Question JSON Import</span>
        </button>
      </div>

      {/* SUB-TAB 1: DAILY MODULES CONTENT EDITOR */}
      {cmsTab === 'modules' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Day 1 to Day 30 Selector Sidebar */}
          <div className="bg-surface-lowest border border-hairline/60 rounded-2xl p-5 space-y-3 shadow-sm lg:col-span-1 h-fit">
            <div className="flex items-center justify-between border-b border-hairline/50 pb-3">
              <span className="mono-micro-label text-primary">Select Module Day</span>
              <span className="text-[11px] font-mono text-text-muted">{selectedLevel}</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 max-h-[500px] overflow-y-auto pr-1">
              {Array.from({ length: selectedLevel === 'Free Trial' ? 7 : 30 }, (_, i) => i + 1).map((dayNum) => {
                const isSelected = selectedDay === dayNum;
                const isPopulated = populatedDays.includes(dayNum);
                return (
                  <button
                    key={dayNum}
                    onClick={() => handleSelectDay(dayNum)}
                    title={isPopulated ? `Day ${dayNum} - Added to Database` : `Day ${dayNum} - Draft / Unpopulated`}
                    className={`p-2 text-xs font-mono font-semibold rounded-xl border text-center transition-all focus-ring relative flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                        : isPopulated
                        ? 'bg-success-green/10 text-success-green border-success-green/40 hover:border-success-green'
                        : 'bg-surface-lowest text-on-surface border-hairline hover:border-primary opacity-80'
                    }`}
                  >
                    <span>D{dayNum}</span>
                    {isPopulated ? (
                      <span className="text-[9px] font-sans font-bold text-success-green leading-none mt-0.5">
                        ✓ Added
                      </span>
                    ) : (
                      <span className="text-[9px] font-sans text-text-muted leading-none mt-0.5">
                        Draft
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module Content Form for Selected Day */}
          <div className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm lg:col-span-3 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline/50 pb-4">
              <div>
                <span className="mono-micro-label text-primary">
                  EDITING {selectedLevel} • DAY {selectedDay} MODULE
                </span>
                <h3 className="font-cormorant text-2xl font-normal text-on-surface mt-1">
                  Task Videos & Reference Guide Assignment
                </h3>
              </div>

              {saveSuccessMsg && (
                <span className="px-3 py-1 bg-success-green/10 border border-success-green/30 text-success-green text-xs font-mono font-semibold rounded-full animate-fade-in">
                  ✓ {saveSuccessMsg}
                </span>
              )}
            </div>

            {moduleErrorMsg && (
              <div className="p-4 bg-destructive-red/10 border border-destructive-red/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono animate-fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{moduleErrorMsg}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Task 1 Section */}
              <div className="p-5 bg-surface-lowest border border-hairline/60 rounded-2xl space-y-4">
                <span className="mono-micro-label text-primary block">
                  Task 1 — Lesson Video & Reference Book Guide
                </span>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-on-surface-variant font-semibold">
                    Lesson Title <span className="text-destructive-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={activeDayForm.lessonTitle}
                    onChange={(e) => setActiveDayForm({ ...activeDayForm, lessonTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface-low border border-hairline rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-on-surface-variant font-semibold">
                    YouTube Video Embed Link <span className="text-destructive-red">*</span>
                  </label>
                  <input
                    type="url"
                    value={activeDayForm.lessonVideoUrl}
                    onChange={(e) => setActiveDayForm({ ...activeDayForm, lessonVideoUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface-low border border-hairline rounded-xl text-sm font-mono text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-on-surface-variant font-semibold">
                      Reference Book Filename <span className="text-destructive-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={activeDayForm.refGuideTitle}
                      onChange={(e) => setActiveDayForm({ ...activeDayForm, refGuideTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-mono text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-on-surface-variant font-semibold">
                      Reference Guide Description <span className="text-destructive-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={activeDayForm.refGuideDescription}
                      onChange={(e) => setActiveDayForm({ ...activeDayForm, refGuideDescription: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* PDF Storage Upload Box for Task 1 Reference Guide */}
                <div className="space-y-2 pt-3 border-t border-hairline/50">
                  <label className="block text-xs font-mono font-semibold text-on-surface-variant">
                    Upload Reference Book PDF File <span className="text-destructive-red">*</span>
                  </label>

                  <div className="relative border-2 border-dashed border-hairline hover:border-primary bg-surface-low rounded-xl p-4 transition-colors text-center cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedModulePdfFile(e.target.files[0]);
                          setModuleErrorMsg('');
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    {selectedModulePdfFile ? (
                      <div className="flex items-center justify-between text-left text-xs font-mono text-primary">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck size={18} className="text-success-green shrink-0" />
                          <span className="truncate font-semibold">{selectedModulePdfFile.name}</span>
                          <span className="text-[10px] text-text-muted">
                            ({(selectedModulePdfFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModulePdfFile(null);
                          }}
                          className="text-destructive-red hover:underline text-xs font-sans font-bold px-2.5 py-0.5 border border-destructive-red/30 rounded-full shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                    ) : activeDayForm.refGuideUrl ? (
                      <div className="flex items-center justify-between text-left text-xs font-mono text-success-green">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck size={18} className="text-success-green shrink-0" />
                          <span className="truncate font-semibold">Uploaded PDF: {activeDayForm.refGuideUrl}</span>
                        </div>
                        <span className="text-[10px] font-sans font-bold bg-success-green/10 text-success-green px-2 py-0.5 rounded-full uppercase shrink-0">
                          Click to Replace PDF
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-on-surface-variant py-1">
                        <Upload size={20} className="text-primary" />
                        <span className="text-xs font-medium">Click or Drag & Drop Task 1 Reference PDF File Here</span>
                        <span className="text-[10px] text-text-muted font-mono">Uploads to Supabase Storage `curriculum-books` bucket</span>
                      </div>
                    )}
                  </div>
                </div>

                </div>

              {/* Task 2 Section */}
              <div className="p-5 bg-surface-lowest border border-hairline/60 rounded-2xl space-y-4">
                <span className="mono-micro-label text-primary block">
                  Task 2 — Listening Skill Videos (2 Options)
                </span>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-on-surface-variant font-semibold">
                    Option 1: Informative Video YouTube Link <span className="text-destructive-red">*</span>
                  </label>
                  <input
                    type="url"
                    value={activeDayForm.listeningInformativeUrl}
                    onChange={(e) => setActiveDayForm({ ...activeDayForm, listeningInformativeUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface-low border border-hairline rounded-xl text-xs font-mono text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-on-surface-variant font-semibold">
                    Option 2: Entertainment Video YouTube Link <span className="text-destructive-red">*</span>
                  </label>
                  <input
                    type="url"
                    value={activeDayForm.listeningEntertainmentUrl}
                    onChange={(e) => setActiveDayForm({ ...activeDayForm, listeningEntertainmentUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface-low border border-hairline rounded-xl text-xs font-mono text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveDayContent}
                disabled={isUploadingModulePdf}
                className="rounded-full bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-semibold text-xs tracking-wider uppercase px-6 py-3 transition-all flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer"
              >
                {isUploadingModulePdf ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading Reference PDF & Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save {selectedLevel} Day {selectedDay} Content</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BULK QUESTION JSON IMPORT */}
      {cmsTab === 'json' && (
        <div className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-hairline/50 pb-5">
            <span className="mono-micro-label text-primary">Bulk Diagnostic Question Ingestion</span>
            <h3 className="font-cormorant text-2xl font-normal text-on-surface mt-1">
              Import Question Bank JSON Array
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Paste JSON arrays containing multiple-choice diagnostic questions. The system ingests them into the database pool for 20-question daily exams.
            </p>
          </div>

          {jsonError && (
            <div className="p-4 bg-destructive-red/10 border border-destructive-red/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono">
              <AlertCircle size={16} className="shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {jsonSuccess && (
            <div className="p-4 bg-success-green/10 border border-success-green/30 text-success-green text-xs rounded-xl flex items-center gap-2 font-mono">
              <CheckCircle size={16} className="shrink-0" />
              <span>{jsonSuccess}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
              <span>JSON Input Buffer</span>
              <button
                onClick={() => setJsonInput(JSON.stringify(sampleQuestionJsonTemplate, null, 2))}
                className="text-primary font-bold hover:underline focus-ring rounded p-0.5 cursor-pointer"
              >
                Load Sample JSON Template
              </button>
            </div>

            <textarea
              rows={12}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON array format: [{ question, options: [...], answerIndex, dayNumber, level }, ...]"
              className="w-full p-4 bg-surface-lowest border border-hairline rounded-2xl font-mono text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleJsonImport}
              disabled={!jsonInput.trim()}
              className="rounded-full bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-semibold text-xs tracking-wider uppercase px-6 py-3 flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer"
            >
              <Upload size={16} />
              <span>Ingest JSON into Question Bank</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumManagement;