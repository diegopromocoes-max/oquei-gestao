import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import SurveyCampaignModal from '../components/SurveyCampaignModal';
import SurveyBuilderCampaigns from '../components/SurveyBuilderCampaigns';
import SurveyBuilderHero from '../components/SurveyBuilderHero';
import InsightsKnowledgeBase from '../components/InsightsKnowledgeBase';
import { styles as global } from '../../styles/globalStyles';
import { normalizeSurveyRecord, safeNormalizeSurveyRecord } from '../lib/surveyLegacy';
import {
  NEW_TRIGGER_VALUE,
  buildSurveyTriggerOptions,
  resolveSurveyTriggerLabel,
  slugifyTriggerLabel,
} from '../lib/surveyTriggers';
import {
  DEFAULT_SURVEY_FORM,
  STATUS_LABEL,
  createQuestionFromBank,
  emptyQuestion,
  sanitizeQuestions,
} from '../lib/surveyQuestions';

const STATUS_ORDER = ['active', 'draft', 'finished'];

const getCityLabel = (city) => city?.name || city?.nome || city?.id || 'Cidade';

const sortByDateDesc = (list) =>
  [...list].sort((a, b) => {
    const aTime = a?.updatedAt?.seconds || a?.createdAt?.seconds || 0;
    const bTime = b?.updatedAt?.seconds || b?.createdAt?.seconds || 0;
    return bTime - aTime;
  });

const mapDocs = (snapshot, mapper = (item) => item.data()) =>
  snapshot.docs.map((item) => mapper(item));

export default function SurveyBuilder() {
  const [surveys, setSurveys] = useState([]);
  const [cities, setCities] = useState([]);
  const [themes, setThemes] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [savingTrigger, setSavingTrigger] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(DEFAULT_SURVEY_FORM);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const [surveyResult, cityResult, themeResult, questionResult, triggerResult] = await Promise.allSettled([
          getDocs(collection(db, 'surveys')),
          getDocs(collection(db, 'cities')),
          getDocs(collection(db, 'survey_themes')),
          getDocs(collection(db, 'survey_question_bank')),
          getDocs(collection(db, 'survey_triggers')),
        ]);

        if (surveyResult.status === 'fulfilled') {
          setSurveys(
            sortByDateDesc(
              mapDocs(surveyResult.value, (item) => safeNormalizeSurveyRecord({ id: item.id, ...item.data() })),
            ),
          );
        }

        if (cityResult.status === 'fulfilled') {
          setCities(mapDocs(cityResult.value, (item) => ({ id: item.id, ...item.data() })));
        }

        if (themeResult.status === 'fulfilled') {
          setThemes(sortByDateDesc(mapDocs(themeResult.value, (item) => ({ id: item.id, ...item.data() }))));
        }

        if (questionResult.status === 'fulfilled') {
          setQuestionBank(sortByDateDesc(mapDocs(questionResult.value, (item) => ({ id: item.id, ...item.data() }))));
        }

        if (triggerResult.status === 'fulfilled') {
          setTriggers(sortByDateDesc(mapDocs(triggerResult.value, (item) => ({ id: item.id, ...item.data() }))));
        }

        const failedLoads = [
          surveyResult.status === 'rejected' ? 'campanhas' : null,
          cityResult.status === 'rejected' ? 'cidades' : null,
          themeResult.status === 'rejected' ? 'temas' : null,
          questionResult.status === 'rejected' ? 'banco de perguntas' : null,
          triggerResult.status === 'rejected' ? 'gatilhos' : null,
        ].filter(Boolean);

        if (failedLoads.length) {
          window.showToast?.(
            `Alguns dados nao puderam ser carregados: ${failedLoads.join(', ')}.`,
            'warning',
          );
        }
      } catch (error) {
        window.showToast?.(error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const counts = useMemo(
    () => surveys.reduce((acc, survey) => ({ ...acc, [survey.status]: (acc[survey.status] || 0) + 1 }), {}),
    [surveys],
  );

  const themeMap = useMemo(
    () => Object.fromEntries(themes.map((theme) => [theme.id, theme])),
    [themes],
  );

  const activeThemes = useMemo(
    () => themes.filter((theme) => theme.status !== 'inactive'),
    [themes],
  );

  const triggerOptions = useMemo(
    () => buildSurveyTriggerOptions(triggers, form.trigger, form.triggerLabel),
    [form.trigger, form.triggerLabel, triggers],
  );

  const unknownStatusSurveys = useMemo(
    () => surveys.filter((survey) => !STATUS_ORDER.includes(survey.status)),
    [surveys],
  );

  const applySurveyContext = (draft) => {
    const selectedThemes = themes.filter((theme) => draft.themeIds.includes(theme.id));
    const selectedCities = cities.filter((city) => draft.targetCities.includes(city.id));

    return {
      ...draft,
      title: String(draft.title || '').trim(),
      description: String(draft.description || '').trim(),
      objective: String(draft.objective || '').trim(),
      triggerLabel: resolveSurveyTriggerLabel(draft.trigger, triggerOptions, draft.triggerLabel),
      themeNames: selectedThemes.map((theme) => theme.name),
      targetCityNames: selectedCities.map(getCityLabel),
    };
  };

  const handleFormChange = (field, value) =>
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

  const persistSurvey = async (id, data, options = {}) => {
    const currentSurvey = surveys.find((survey) => survey.id === id);
    const clean = data.questions !== undefined ? { ...data, questions: sanitizeQuestions(data.questions) } : data;
    const nextVersion = options.bumpVersion
      ? Math.max(1, Number(currentSurvey?.questionnaireVersion || 1) + 1)
      : currentSurvey?.questionnaireVersion || clean.questionnaireVersion || 1;

    const payload = {
      ...clean,
      ...(options.bumpVersion ? { questionnaireVersion: nextVersion } : {}),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, 'surveys', id), payload);

    const merged = {
      ...clean,
      ...(options.bumpVersion ? { questionnaireVersion: nextVersion } : {}),
    };

    setSurveys((current) =>
      sortByDateDesc(
        current.map((survey) => (
          survey.id === id
            ? normalizeSurveyRecord({ ...survey, ...merged })
            : survey
        )),
      ),
    );
  };

  const openNew = () => {
    setEditId(null);
    setForm(DEFAULT_SURVEY_FORM);
    setModalOpen(true);
  };

  const openEdit = (survey) => {
    setEditId(survey.id);
    setForm({
      title: survey.title || '',
      description: survey.description || '',
      objective: survey.objective || '',
      trigger: survey.trigger || '',
      triggerLabel: survey.triggerLabel || '',
      targetCities: survey.targetCities || [],
      themeIds: survey.themeIds || [],
    });
    setModalOpen(true);
  };

  const handleTriggerChange = async (value) => {
    if (value !== NEW_TRIGGER_VALUE) {
      const selected = triggerOptions.find((item) => item.value === value);
      setForm((current) => ({
        ...current,
        trigger: value,
        triggerLabel: selected?.label || '',
      }));
      return;
    }

    const label = window.prompt('Informe o nome do novo gatilho de pesquisa.');
    if (!label?.trim()) return;

    const normalizedLabel = label.trim();
    const existing = triggerOptions.find(
      (item) => item.label?.trim().toLowerCase() === normalizedLabel.toLowerCase(),
    );

    if (existing) {
      setForm((current) => ({
        ...current,
        trigger: existing.value,
        triggerLabel: existing.label,
      }));
      window.showToast?.('Este gatilho ja existe e foi selecionado.', 'info');
      return;
    }

    const nextValue = slugifyTriggerLabel(normalizedLabel);
    if (!nextValue) {
      window.showToast?.('Nao foi possivel gerar um identificador para este gatilho.', 'error');
      return;
    }

    setSavingTrigger(true);
    try {
      const payload = {
        value: nextValue,
        label: normalizedLabel,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
      };

      const ref = await addDoc(collection(db, 'survey_triggers'), payload);
      setTriggers((current) => sortByDateDesc([{ id: ref.id, ...payload }, ...current]));
      setForm((current) => ({
        ...current,
        trigger: nextValue,
        triggerLabel: normalizedLabel,
      }));
      window.showToast?.('Novo gatilho cadastrado.', 'success');
    } catch (error) {
      window.showToast?.(error.message, 'error');
    } finally {
      setSavingTrigger(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      window.showToast?.('Informe o titulo da campanha.', 'error');
      return;
    }

    if (!form.objective.trim()) {
      window.showToast?.('Informe o objetivo estrategico.', 'error');
      return;
    }

    if (!form.trigger) {
      window.showToast?.('Selecione o gatilho da pesquisa.', 'error');
      return;
    }

    setSaving(true);
    try {
      const contextualized = applySurveyContext(form);

      if (editId) {
        await persistSurvey(editId, contextualized);
        window.showToast?.('Campanha atualizada.', 'success');
      } else {
        const payload = {
          ...contextualized,
          status: 'draft',
          questions: [],
          questionnaireVersion: 1,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || null,
        };

        const ref = await addDoc(collection(db, 'surveys'), payload);
        setSurveys((current) => sortByDateDesc([normalizeSurveyRecord({ id: ref.id, ...payload }), ...current]));
        window.showToast?.('Campanha criada como rascunho.', 'success');
      }

      setModalOpen(false);
      setEditId(null);
      setForm(DEFAULT_SURVEY_FORM);
    } catch (error) {
      window.showToast?.(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (survey) => {
    if (!window.confirm('Pausar esta campanha para revisao?')) return;
    await persistSurvey(survey.id, { status: 'draft' });
    window.showToast?.('Campanha voltou para rascunho.', 'warning');
  };

  const handleReactivate = async (survey) => {
    if (!window.confirm('Reativar esta campanha? Ela voltará para rascunho para revisão antes de ser ativada novamente.')) return;
    await persistSurvey(survey.id, { status: 'draft', reactivatedAt: serverTimestamp() });
    window.showToast?.('Campanha reativada como rascunho. Revise e ative quando estiver pronta.', 'success');
  };

  const handleToggleStatus = async (survey) => {
    if (survey.status === 'draft') {
      await persistSurvey(survey.id, applySurveyContext(survey));
      await persistSurvey(survey.id, { status: 'active' });
      window.showToast?.('Campanha ativada.', 'success');
      return;
    }

    if (!window.confirm('Encerrar esta campanha?')) return;
    await persistSurvey(survey.id, { status: 'finished' });
    window.showToast?.('Campanha encerrada.', 'success');
  };

  const handleAddQuestion = async (survey) =>
    persistSurvey(
      survey.id,
      { questions: [...(survey.questions || []), emptyQuestion()] },
      { bumpVersion: true },
    );

  const handleAddBankQuestion = async (survey, bankQuestion) => {
    const alreadyExists = (survey.questions || []).some(
      (question) => question.bankQuestionId === bankQuestion.id,
    );

    if (alreadyExists) {
      window.showToast?.('Esta pergunta ja foi adicionada.', 'warning');
      return;
    }

    await persistSurvey(
      survey.id,
      { questions: [...(survey.questions || []), createQuestionFromBank(bankQuestion)] },
      { bumpVersion: true },
    );
    window.showToast?.('Pergunta adicionada a campanha.', 'success');
  };

  const handleAddCoreQuestions = async (survey) => {
    const themeIds = new Set(survey.themeIds || []);
    const existingIds = new Set(
      (survey.questions || [])
        .map((question) => question.bankQuestionId)
        .filter(Boolean),
    );

    const missingCore = questionBank
      .filter((question) => question.active !== false && question.isCore)
      .filter((question) => (themeIds.size ? themeIds.has(question.themeId) : true))
      .filter((question) => !existingIds.has(question.id))
      .map(createQuestionFromBank);

    if (!missingCore.length) {
      window.showToast?.('Nao ha perguntas nucleo pendentes para esta campanha.', 'warning');
      return;
    }

    await persistSurvey(
      survey.id,
      { questions: [...(survey.questions || []), ...missingCore] },
      { bumpVersion: true },
    );
    window.showToast?.(`${missingCore.length} pergunta(s) nucleo adicionada(s).`, 'success');
  };

  const handleUpdateQuestion = async (survey, index, nextQuestion) =>
    persistSurvey(
      survey.id,
      {
        questions: survey.questions.map((question, questionIndex) => (
          questionIndex === index ? nextQuestion : question
        )),
      },
      { bumpVersion: true },
    );

  const handleRemoveQuestion = async (survey, index) =>
    persistSurvey(
      survey.id,
      { questions: survey.questions.filter((_, questionIndex) => questionIndex !== index) },
      { bumpVersion: true },
    );

  const handleMoveQuestion = async (survey, from, to) => {
    if (to < 0 || to >= survey.questions.length) return;
    const nextQuestions = [...survey.questions];
    const [item] = nextQuestions.splice(from, 1);
    nextQuestions.splice(to, 0, item);
    await persistSurvey(survey.id, { questions: nextQuestions }, { bumpVersion: true });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta campanha e suas respostas vinculadas?')) return;

    try {
      const batch = writeBatch(db);
      const responseSnap = await getDocs(
        query(collection(db, 'survey_responses'), where('surveyId', '==', id)),
      );

      responseSnap.docs.forEach((item) => batch.delete(item.ref));
      batch.delete(doc(db, 'surveys', id));
      await batch.commit();

      setSurveys((current) => current.filter((survey) => survey.id !== id));
      window.showToast?.('Campanha removida.', 'success');
    } catch (error) {
      window.showToast?.(error.message, 'error');
    }
  };

  const handleCreateTheme = async ({ name, description }) => {
    if (!name.trim()) return false;

    const duplicated = themes.some(
      (theme) => theme.name?.trim().toLowerCase() === name.trim().toLowerCase(),
    );

    if (duplicated) {
      window.showToast?.('Ja existe um tema com este nome.', 'error');
      return false;
    }

    setSavingTheme(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
      };

      const ref = await addDoc(collection(db, 'survey_themes'), payload);
      setThemes((current) => sortByDateDesc([{ id: ref.id, ...payload }, ...current]));
      window.showToast?.('Tema criado.', 'success');
      return true;
    } catch (error) {
      window.showToast?.(error.message, 'error');
      return false;
    } finally {
      setSavingTheme(false);
    }
  };

  const handleToggleThemeStatus = async (theme) => {
    const nextStatus = theme.status === 'inactive' ? 'active' : 'inactive';
    await updateDoc(doc(db, 'survey_themes', theme.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });

    setThemes((current) =>
      current.map((item) => (item.id === theme.id ? { ...item, status: nextStatus } : item)),
    );
  };

  const handleCreateQuestion = async ({
    themeId,
    label,
    type,
    optionsText,
    isCore,
    guidance,
  }) => {
    if (!themeId || !label.trim()) return false;

    const options = optionsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if ((type === 'select' || type === 'multiselect') && !options.length) {
      window.showToast?.('Perguntas de escolha precisam de opcoes.', 'error');
      return false;
    }

    const selectedTheme = themes.find((theme) => theme.id === themeId);
    setSavingQuestion(true);

    try {
      const payload = {
        themeId,
        themeName: selectedTheme?.name || '',
        label: label.trim(),
        type,
        options:
          type === 'select' || type === 'multiselect'
            ? options
            : type === 'boolean'
              ? ['Sim', 'Nao']
              : [],
        guidance: guidance.trim(),
        isCore: Boolean(isCore),
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
      };

      const ref = await addDoc(collection(db, 'survey_question_bank'), payload);
      setQuestionBank((current) => sortByDateDesc([{ id: ref.id, ...payload }, ...current]));
      window.showToast?.('Pergunta adicionada ao banco.', 'success');
      return true;
    } catch (error) {
      window.showToast?.(error.message, 'error');
      return false;
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleToggleQuestionStatus = async (question) => {
    const nextActive = question.active === false;
    await updateDoc(doc(db, 'survey_question_bank', question.id), {
      active: nextActive,
      updatedAt: serverTimestamp(),
    });

    setQuestionBank((current) =>
      current.map((item) => (item.id === question.id ? { ...item, active: nextActive } : item)),
    );
  };

  const toggleCity = (cityId) =>
    setForm((current) => ({
      ...current,
      targetCities: current.targetCities.includes(cityId)
        ? current.targetCities.filter((item) => item !== cityId)
        : [...current.targetCities, cityId],
    }));

  const toggleTheme = (themeId) =>
    setForm((current) => ({
      ...current,
      themeIds: current.themeIds.includes(themeId)
        ? current.themeIds.filter((item) => item !== themeId)
        : [...current.themeIds, themeId],
    }));

  return (
    <div style={{ ...global.container }}>
      <SurveyBuilderHero
        counts={counts}
        statusOrder={STATUS_ORDER}
        statusLabelMap={STATUS_LABEL}
        surveyCount={surveys.length}
        onCreate={openNew}
      />

      <InsightsKnowledgeBase
        themes={themes}
        questionBank={questionBank}
        savingTheme={savingTheme}
        savingQuestion={savingQuestion}
        onCreateTheme={handleCreateTheme}
        onCreateQuestion={handleCreateQuestion}
        onToggleThemeStatus={handleToggleThemeStatus}
        onToggleQuestionStatus={handleToggleQuestionStatus}
      />

      <SurveyBuilderCampaigns
        loading={loading}
        surveys={surveys}
        statusOrder={STATUS_ORDER}
        statusLabelMap={STATUS_LABEL}
        unknownStatusSurveys={unknownStatusSurveys}
        questionBank={questionBank}
        themeMap={themeMap}
        onCreateCampaign={openNew}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onPause={handlePause}
        onReactivate={handleReactivate}
        onAddQuestion={handleAddQuestion}
        onAddBankQuestion={handleAddBankQuestion}
        onAddCoreQuestions={handleAddCoreQuestions}
        onUpdateQuestion={handleUpdateQuestion}
        onRemoveQuestion={handleRemoveQuestion}
        onMoveQuestion={handleMoveQuestion}
      />

      <SurveyCampaignModal
        open={modalOpen}
        editId={editId}
        form={form}
        saving={saving}
        savingTrigger={savingTrigger}
        activeThemes={activeThemes}
        cities={cities}
        triggerOptions={triggerOptions}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onChangeForm={handleFormChange}
        onToggleTheme={toggleTheme}
        onToggleCity={toggleCity}
        onTriggerChange={handleTriggerChange}
        getCityLabel={getCityLabel}
      />
    </div>
  );
}