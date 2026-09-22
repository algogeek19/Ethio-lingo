import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Upload,
  CheckCircle,
  AlertCircle,
  Trash2,
  Code,
  Film,
  Save,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { useStaking, CURRICULUM_LEVELS } from '../../context/StakingContext';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabaseClient';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const CurriculumManagement = () => {
  const { importQuestionBankJson } = useStaking();
  
  // Selected Level State
  const [selectedLevel, setSelectedLevel] = useState('Beginner I');
  const [selectedDay, setSelectedDay] = useState(1); // Day 1 to 30

  // Delete Book Dialog State
  const [deleteBookModal, setDeleteBookModal] = useState(null); // bookId or null
  const [isDeletingBook, setIsDeletingBook] = useState(false);

  // CMS Sub-Tab: 'modules' | 'books' | 'json'
  const [cmsTab, setCmsTab] = useState('modules');

  // Level Books State & Module Content State from API
  const [levelBooks, setLevelBooks] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
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

  const [newBook, setNewBook] = useState({ title: '', author: '', category: 'Grammar', url: '' });
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
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

  // Dedicated fetch for Task 3 reading choices whenever selectedLevel changes
  useEffect(() => {
    const loadBooksForLevel = async () => {
      setIsLoadingBooks(true);
      try {
        const res = await api.getLevelBooks(selectedLevel);
        if (res.success && Array.isArray(res.data)) {
          setLevelBooks(res.data);
        } else {
          setLevelBooks([]);
        }
      } catch (err) {
        console.error('Error fetching level books:', err);
        setLevelBooks([]);
      } finally {
        setIsLoadingBooks(false);
      }
    };

    loadBooksForLevel();
  }, [selectedLevel]);

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

  // Add Book for Selected Level via API & Direct Supabase Storage PDF Upload
  const handleAddBookToLevel = async (e) => {
    e.preventDefault();
    if (!newBook.title) return;
    setPdfUploadError('');

    try {
      let finalPdfUrl = newBook.url || '';

      // Direct PDF Upload to Supabase Storage if file is selected
      if (selectedPdfFile) {
        setIsUploadingPdf(true);
        const sanitizeName = selectedPdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const levelSubfolder = selectedLevel.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filePath = `${levelSubfolder}/${Date.now()}_${sanitizeName}`;

        const { error: uploadErr } = await supabase.storage
          .from('curriculum-books')
          .upload(filePath, selectedPdfFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/pdf',
          });

        if (uploadErr) {
          throw new Error(`Supabase Storage Upload Error: ${uploadErr.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('curriculum-books')
          .getPublicUrl(filePath);

        finalPdfUrl = publicUrlData.publicUrl;
      }

      if (!finalPdfUrl) {
        throw new Error('Please select a PDF file to upload to Supabase Storage.');
      }

      const bookPayload = {
        level: selectedLevel,
        title: newBook.title,
        author: newBook.author || 'Ethio-Lingo Academic Press',
        category: newBook.category || 'General Reader',
        url: finalPdfUrl,
      };

      const res = await api.addLevelBook(bookPayload);
      if (res.success && res.data) {
        setLevelBooks((prev) => (Array.isArray(prev) ? [...prev, res.data] : [res.data]));
        setNewBook({ title: '', author: '', category: 'Grammar', url: '' });
        setSelectedPdfFile(null);
        setIsUploadingPdf(false);
        setShowAddBook(false);
      }
    } catch (err) {
      setIsUploadingPdf(false);
      setPdfUploadError(err.message || 'Failed to upload PDF book.');
    }
  };

  const handleConfirmDeleteBook = async () => {
    if (!deleteBookModal) return;
    setIsDeletingBook(true);
    try {
      await api.deleteLevelBook(deleteBookModal);
      setLevelBooks((prev) => (Array.isArray(prev) ? prev.filter((b) => b.id !== deleteBookModal) : []));
      setSaveSuccessMsg('PDF book deleted successfully from level catalog!');
      setDeleteBookModal(null);
      setTimeout(() => setSaveSuccessMsg(''), 3500);
    } catch (err) {
      setPdfUploadError(err.message || 'Error deleting book');
    } finally {
      setIsDeletingBook(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors duration-250">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-surface-dark text-warning-amber border border-stone-800 font-mono text-[10px] font-bold rounded uppercase">
              CURRICULUM MANAGEMENT PORTAL
            </span>
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-on-surface mt-2">
            Curriculum Content & Question Bank Manager
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage daily lesson YouTube videos, reference PDF manuals, listening task URLs, reading choices, and bulk import diagnostic exam questions across all 6 levels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="px-4 py-2 bg-surface-card hover:bg-surface-high text-on-surface font-semibold text-xs rounded-xl transition-all focus-ring"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>

      {/* LEVEL SELECTION PILLS */}
      <div className="space-y-3">
        <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">
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
                className={`py-3 px-3 rounded-xl border text-xs font-semibold text-center transition-all focus-ring cursor-pointer ${
                  isSelected
                    ? 'bg-primary-coral text-white border-primary-coral shadow-md font-bold'
                    : 'bg-surface-lowest text-on-surface border-hairline hover:border-primary-coral'
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
              ? 'border-primary-coral text-primary-coral'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Film size={16} />
          <span>Daily Modules Editor (Day 1 - Day 30)</span>
        </button>

        <button
          role="tab"
          aria-selected={cmsTab === 'books'}
          onClick={() => setCmsTab('books')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring ${
            cmsTab === 'books'
              ? 'border-primary-coral text-primary-coral'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <BookOpen size={16} />
          <span>Task 3 Level Reading Books</span>
        </button>

        <button
          role="tab"
          aria-selected={cmsTab === 'json'}
          onClick={() => setCmsTab('json')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring ${
            cmsTab === 'json'
              ? 'border-primary-coral text-primary-coral'
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
          <div className="bg-canvas border border-hairline rounded-2xl p-4 space-y-3 lg:col-span-1 h-fit">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <span className="text-xs font-mono font-bold text-primary-coral uppercase">SELECT MODULE DAY</span>
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
                    className={`p-2 text-xs font-mono font-bold rounded-xl border text-center transition-all focus-ring relative flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-surface-dark text-white border-surface-dark shadow-xs'
                        : isPopulated
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:border-emerald-500'
                        : 'bg-surface-lowest text-on-surface border-hairline hover:border-primary-coral opacity-80'
                    }`}
                  >
                    <span>D{dayNum}</span>
                    {isPopulated ? (
                      <span className="text-[9px] font-sans font-bold text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
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
          <div className="bg-canvas border border-hairline rounded-2xl p-6 lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <span className="text-xs font-mono text-primary-coral font-bold uppercase">
                  EDITING {selectedLevel} • DAY {selectedDay} MODULE
                </span>
                <h3 className="font-serif font-bold text-xl text-on-surface mt-0.5">
                  Task Videos & Reference Guide Assignment
                </h3>
              </div>

              {saveSuccessMsg && (
                <span className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-success-green text-xs font-mono font-semibold rounded-lg animate-fade-in">
                  ✓ {saveSuccessMsg}
                </span>
              )}
            </div>

            {moduleErrorMsg && (
              <div className="p-4 bg-red-500/15 border border-red-500/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono animate-fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{moduleErrorMsg}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Task 1 Section */}
              <div className="p-4 bg-surface-lowest border border-hairline rounded-xl space-y-4">
                <span className="text-xs font-mono font-bold text-primary-coral uppercase block">
                  Task 1: Lesson Video & Reference Book Guide
                </span>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-on-surface-variant font-bold">
                    Lesson Title <span className="text-destructive-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={activeDayForm.lessonTitle}
                    onChange={(e) => setActiveDayForm({ ...activeDayForm, lessonTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-sm text-on-surface focus-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-on-surface-variant font-bold">
                    YouTube Video Embed Link <span className="text-destructive-red">*</span>
                  </label>
                  <input
                    type="url"
                    value={activeDayForm.lessonVideoUrl}
                    onChange={(e) => setActiveDayForm({ ...activeDayForm, lessonVideoUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-sm font-mono text-on-surface focus-ring"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-on-surface-variant font-bold">
                      Reference Book Filename <span className="text-destructive-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={activeDayForm.refGuideTitle}
                      onChange={(e) => setActiveDayForm({ ...activeDayForm, refGuideTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-canvas border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-on-surface-variant font-bold">
                      Reference Guide Description <span className="text-destructive-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={activeDayForm.refGuideDescription}
                      onChange={(e) => setActiveDayForm({ ...activeDayForm, refGuideDescription: e.target.value })}
                      className="w-full px-3 py-2 bg-canvas border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                    />
                  </div>
                </div>

                {/* PDF Storage Upload Box for Task 1 Reference Guide */}
                <div className="space-y-2 pt-2 border-t border-hairline">
                  <label className="block text-xs font-mono font-bold text-on-surface-variant">
                    Upload Reference Book PDF File <span className="text-destructive-red">*</span>
                  </label>

                  <div className="relative border-2 border-dashed border-hairline hover:border-primary-coral bg-canvas rounded-xl p-3.5 transition-colors text-center cursor-pointer">
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
                      <div className="flex items-center justify-between text-left text-xs font-mono text-primary-coral">
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
                          className="text-destructive-red hover:underline text-xs font-sans font-bold px-2 py-0.5 border border-destructive-red/30 rounded"
                        >
                          Clear
                        </button>
                      </div>
                    ) : activeDayForm.refGuideUrl ? (
                      <div className="flex items-center justify-between text-left text-xs font-mono text-emerald-600 dark:text-emerald-400">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck size={18} className="text-emerald-500 shrink-0" />
                          <span className="truncate font-semibold">Uploaded PDF: {activeDayForm.refGuideUrl}</span>
                        </div>
                        <span className="text-[10px] font-sans font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded uppercase shrink-0">
                          Click to Replace PDF
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-on-surface-variant py-1">
                        <Upload size={20} className="text-primary-coral" />
                        <span className="text-xs font-medium">Click or Drag & Drop Task 1 Reference PDF File Here</span>
                        <span className="text-[10px] text-text-muted font-mono">Uploads to Supabase Storage `curriculum-books` bucket</span>
                      </div>
                    )}
                  </div>
                </div>

                </div>

              {/* Task 2 Section */}
              <div className="p-4 bg-surface-lowest border border-hairline rounded-xl space-y-4">
                <span className="text-xs font-mono font-bold text-primary-coral uppercase block">
                  Task 2: Listening Skill Videos (2 Options)
                </span>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-on-surface-variant font-bold">
                    Option 1: Informative Video YouTube Link <span className="text-destructive-red">*</span>
                  </label>
                  <input
                    type="url"
                    value={activeDayForm.listeningInformativeUrl}
                    onChange={(e) => setActiveDayForm({ ...activeDayForm, listeningInformativeUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-on-surface-variant font-bold">
                    Option 2: Entertainment Video YouTube Link <span className="text-destructive-red">*</span>
                  </label>
                  <input
                    type="url"
                    value={activeDayForm.listeningEntertainmentUrl}
                    onChange={(e) => setActiveDayForm({ ...activeDayForm, listeningEntertainmentUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveDayContent}
                disabled={isUploadingModulePdf}
                className="px-6 py-3 bg-primary-coral hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
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

      {/* SUB-TAB 2: TASK 3 LEVEL READING BOOKS MANAGER */}
      {cmsTab === 'books' && (
        <div className="bg-canvas border border-hairline rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
            <div>
              <span className="text-xs font-mono text-primary-coral font-bold uppercase">
                LEVEL PDF BOOKS CATALOG
              </span>
              <h3 className="font-serif font-bold text-xl text-on-surface mt-0.5">
                Task 3 Reading PDF Choices for {selectedLevel}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Learners in {selectedLevel} choose from these assigned PDF books for their daily 20-minute timed reading task.
              </p>
            </div>

            <button
              onClick={() => setShowAddBook(!showAddBook)}
              className="px-4 py-2 bg-primary-coral text-white font-semibold text-xs rounded-xl hover:bg-primary-hover flex items-center gap-1.5 focus-ring btn-interactive cursor-pointer"
            >
              <Plus size={16} />
              <span>Add PDF Book to {selectedLevel}</span>
            </button>
          </div>

          {/* Add Book Form Modal/Box */}
          {showAddBook && (
            <form onSubmit={handleAddBookToLevel} className="p-5 bg-surface-lowest border-2 border-primary-coral rounded-2xl space-y-4 animate-fade-in shadow-md">
              <div className="flex items-center justify-between border-b border-hairline pb-2">
                <h4 className="font-serif font-bold text-base text-on-surface flex items-center gap-2">
                  <Upload size={18} className="text-primary-coral" />
                  <span>Upload PDF Book File ({selectedLevel})</span>
                </h4>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-surface-card text-primary-coral rounded uppercase">
                  Bucket: curriculum-books
                </span>
              </div>

              {pdfUploadError && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{pdfUploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1">Book Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Advanced Legal & Financial Terminology"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1">Author / Institution</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Tadesse Biru"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1">Category Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. Grammar / Law / Reader"
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                  />
                </div>

                {/* Direct PDF File Upload Box */}
                <div className="space-y-1">
                  <label className="block text-xs font-mono font-bold text-on-surface-variant">
                    PDF File Upload * (Select .pdf file)
                  </label>
                  <div className="relative border-2 border-dashed border-hairline hover:border-primary-coral bg-canvas rounded-xl p-3 transition-colors text-center cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedPdfFile(e.target.files[0]);
                          setPdfUploadError('');
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {selectedPdfFile ? (
                      <div className="flex items-center justify-between text-left text-xs font-mono text-primary-coral">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck size={18} className="text-success-green shrink-0" />
                          <span className="truncate font-semibold">{selectedPdfFile.name}</span>
                          <span className="text-[10px] text-text-muted">
                            ({(selectedPdfFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPdfFile(null);
                          }}
                          className="text-destructive-red hover:underline text-xs font-sans font-bold px-2 py-0.5 border border-destructive-red/30 rounded"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-on-surface-variant">
                        <Upload size={20} className="text-primary-coral" />
                        <span className="text-xs font-medium">Click or Drag & Drop PDF File Here</span>
                        <span className="text-[10px] text-text-muted font-mono">Accepts .pdf format files</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  disabled={isUploadingPdf}
                  onClick={() => {
                    setShowAddBook(false);
                    setSelectedPdfFile(null);
                    setPdfUploadError('');
                  }}
                  className="px-4 py-2 border border-hairline text-xs font-semibold rounded-xl text-on-surface-variant hover:bg-surface-card focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPdf || (!selectedPdfFile && !newBook.url)}
                  className="px-5 py-2 bg-primary-coral text-white text-xs font-semibold rounded-xl hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
                >
                  {isUploadingPdf ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Uploading File...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Upload & Save Book File</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Book Catalog Table */}
          <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-card border-b border-hairline text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3.5 px-4">Book Title & Category</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">File Download Link</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs font-mono">
                {isLoadingBooks ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-on-surface-variant font-sans">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin text-primary-coral" />
                        <span>Loading {selectedLevel} books...</span>
                      </div>
                    </td>
                  </tr>
                ) : (Array.isArray(levelBooks) ? levelBooks.filter((b) => !b.level || b.level === selectedLevel) : []).length > 0 ? (
                  (Array.isArray(levelBooks) ? levelBooks.filter((b) => !b.level || b.level === selectedLevel) : []).map((book) => (
                    <tr key={book.id} className="hover:bg-surface-soft transition-colors">
                      <td className="py-3.5 px-4 font-sans font-bold text-on-surface">
                        <div>{book.title}</div>
                        <span className="px-2 py-0.5 bg-surface-card border border-hairline text-primary-coral text-[9px] font-mono font-bold rounded uppercase mt-1 inline-block">
                          {book.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant font-sans">{book.author}</td>
                      <td className="py-3.5 px-4 text-primary-coral font-mono truncate max-w-xs">
                        <a href={book.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                          <span className="truncate">{book.url}</span>
                        </a>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <button
                          onClick={() => setDeleteBookModal(book.id)}
                          className="p-1.5 text-destructive-red hover:bg-red-500/10 rounded-lg transition-colors focus-ring cursor-pointer"
                          title="Remove Book"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-on-surface-variant font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BookOpen size={28} className="text-text-muted opacity-50" />
                        <p className="font-semibold text-sm text-on-surface">No PDF books assigned for {selectedLevel} yet</p>
                        <p className="text-xs text-text-muted">Click "Add PDF Book to {selectedLevel}" above to upload reading materials for this level.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BULK QUESTION JSON IMPORT */}
      {cmsTab === 'json' && (
        <div className="bg-canvas border border-hairline rounded-2xl p-6 space-y-6">
          <div className="border-b border-hairline pb-4">
            <span className="text-xs font-mono text-primary-coral font-bold uppercase">
              BULK DIAGNOSTIC QUESTION INGESTION
            </span>
            <h3 className="font-serif font-bold text-xl text-on-surface mt-0.5">
              Import Question Bank JSON Array
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Paste JSON arrays containing multiple-choice diagnostic questions. The system ingests them into the database pool for 20-question daily exams.
            </p>
          </div>

          {jsonError && (
            <div className="p-4 bg-red-500/15 border border-red-500/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono">
              <AlertCircle size={16} className="shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {jsonSuccess && (
            <div className="p-4 bg-green-500/15 border border-green-500/30 text-success-green text-xs rounded-xl flex items-center gap-2 font-mono">
              <CheckCircle size={16} className="shrink-0" />
              <span>{jsonSuccess}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
              <span>JSON Input Buffer</span>
              <button
                onClick={() => setJsonInput(JSON.stringify(sampleQuestionJsonTemplate, null, 2))}
                className="text-primary-coral font-bold hover:underline focus-ring rounded p-0.5"
              >
                Load Sample JSON Template
              </button>
            </div>

            <textarea
              rows={12}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON array format: [{ question, options: [...], answerIndex, dayNumber, level }, ...]"
              className="w-full p-4 bg-surface-lowest border border-hairline rounded-2xl font-mono text-xs text-on-surface focus-ring"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleJsonImport}
              disabled={!jsonInput.trim()}
              className="px-6 py-3 bg-primary-coral hover:bg-primary-hover disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
            >
              <Upload size={16} />
              <span>Ingest JSON into Question Bank</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Book Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteBookModal}
        title="Delete Level PDF Book?"
        message="Are you sure you want to remove this PDF reading manual from the level catalog? Learners will no longer be able to select it for Task 3."
        confirmLabel="Delete PDF Book"
        cancelLabel="Cancel"
        type="danger"
        isSubmitting={isDeletingBook}
        onConfirm={handleConfirmDeleteBook}
        onCancel={() => setDeleteBookModal(null)}
      />
    </div>
  );
};

export default CurriculumManagement;
