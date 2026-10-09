/* ============================================================
   سجل المراحل — يجب تحميله قبل ملفات الأسئلة
   ============================================================
   كل ملف مرحلة يستدعي: registerStage({ ... })
   ============================================================ */

window.stagesDatabase = [];

window.registerStage = function (stage) {
    // التحقق من أن الـ id غير مكرر
    const exists = window.stagesDatabase.find(s => s.id === stage.id);
    if (exists) {
        console.warn(`⚠️ المرحلة برقم ${stage.id} مسجّلة مسبقًا، سيتم تجاهلها.`);
        return;
    }
    window.stagesDatabase.push(stage);
};
