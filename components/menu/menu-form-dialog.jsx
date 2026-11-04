"use client";

import { useEffect, useRef, useState } from "react";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";
import { ActionButton } from "@/components/cashier/action-button";
import { buildCategoryPayload, buildItemPayload, imageFileError } from "@/lib/menu/menu";

const areaClass =
  "min-h-24 w-full resize-y rounded-2xl border border-burgundy/15 bg-white px-4 py-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold";

function fileKind(kind) {
  return kind === "category" ? "icon" : "photo";
}

function MenuFormBody({ draft, categories, pending, onSave, onClose }) {
  const [form, setForm] = useState(draft.form);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const previewRef = useRef("");

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function rememberPreview(url) {
    if (previewRef.current && previewRef.current !== url) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = url;
    setPreview(url);
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function chooseFile(event) {
    const next = event.target.files?.[0] || null;
    if (!next) {
      setFile(null);
      rememberPreview("");
      return;
    }
    const message = imageFileError(next, fileKind(draft.kind));
    if (message) {
      setFile(null);
      rememberPreview("");
      setError(message);
      setFileKey((value) => value + 1);
      return;
    }
    setError("");
    setFile(next);
    rememberPreview(URL.createObjectURL(next));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!draft || !form || pending) {
      return;
    }

    const built =
      draft.kind === "category"
        ? buildCategoryPayload(form, { existing: draft.record, file })
        : buildItemPayload(form, {
            existing: draft.record,
            file,
            categoryIds: categories.map((category) => category.id),
          });

    if (!built.ok) {
      setError(built.error);
      return;
    }

    const message = await onSave(built.body);
    if (message) {
      setError(message);
    }
  }

  const title =
    draft.kind === "category"
      ? draft.record
        ? "تعديل التصنيف"
        : "تصنيف جديد"
      : draft.record
        ? "تعديل العنصر"
        : "عنصر جديد";
  const currentImage = draft.kind === "category" ? draft.record?.icon_url : draft.record?.photo_url;
  const imageSrc = preview || currentImage || "";
  const fileAccept =
    draft.kind === "category"
      ? "image/jpeg,image/png,image/webp,image/svg+xml"
      : "image/jpeg,image/png,image/webp";
  const fileHint =
    draft.kind === "category"
      ? "JPEG أو PNG أو WebP أو SVG، حتى 1 ميغابايت. ترك الحقل يبقي الأيقونة الحالية."
      : "JPEG أو PNG أو WebP، حتى 1 ميغابايت. ترك الحقل يبقي الصورة الحالية.";

  return (
        <form onSubmit={handleSubmit} noValidate>
          <h2 id="menu-form-title" className="font-display text-2xl font-semibold text-burgundy-deep">
            {title}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {draft.kind === "item" ? (
              <div className="sm:col-span-2">
                <Field id="menu-category" label="التصنيف">
                  <SelectInput
                    id="menu-category"
                    value={form.category_id}
                    onChange={(event) => update("category_id", event.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name?.ar || "تصنيف"}
                        {category.is_active ? "" : " — مخفي"}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
            ) : null}
            <Field id="menu-name-ar" label="الاسم بالعربية">
              <TextInput
                id="menu-name-ar"
                autoFocus
                value={form.name_ar}
                maxLength={255}
                onChange={(event) => update("name_ar", event.target.value)}
              />
            </Field>
            <Field id="menu-name-en" label="الاسم بالإنجليزية (اختياري)">
              <TextInput
                id="menu-name-en"
                dir="ltr"
                value={form.name_en}
                maxLength={255}
                onChange={(event) => update("name_en", event.target.value)}
              />
            </Field>
            {draft.kind === "item" ? (
              <>
                <label htmlFor="menu-description-ar" className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-burgundy-deep">الوصف بالعربية</span>
                  <textarea
                    id="menu-description-ar"
                    value={form.description_ar}
                    maxLength={500}
                    onChange={(event) => update("description_ar", event.target.value)}
                    className={areaClass}
                  />
                </label>
                <label htmlFor="menu-description-en" className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-burgundy-deep">
                    الوصف بالإنجليزية (اختياري)
                  </span>
                  <textarea
                    id="menu-description-en"
                    dir="ltr"
                    value={form.description_en}
                    maxLength={500}
                    onChange={(event) => update("description_en", event.target.value)}
                    className={areaClass}
                  />
                </label>
                <Field id="menu-price" label="السعر">
                  <TextInput
                    id="menu-price"
                    dir="ltr"
                    inputMode="numeric"
                    value={form.price}
                    onChange={(event) => update("price", event.target.value)}
                  />
                </Field>
                <Field id="menu-badge" label="الشارة">
                  <SelectInput
                    id="menu-badge"
                    value={form.badge || ""}
                    onChange={(event) => update("badge", event.target.value)}
                  >
                    <option value="">بدون</option>
                    <option value="new">جديد</option>
                    <option value="offer">عرض</option>
                  </SelectInput>
                </Field>
              </>
            ) : null}
            <Field id="menu-sort" label="ترتيب العرض">
              <TextInput
                id="menu-sort"
                dir="ltr"
                inputMode="numeric"
                value={form.sort_order}
                onChange={(event) => update("sort_order", event.target.value)}
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm font-semibold text-burgundy-deep">
            <input
              type="checkbox"
              checked={draft.kind === "category" ? form.is_active : form.is_available}
              onChange={(event) =>
                update(draft.kind === "category" ? "is_active" : "is_available", event.target.checked)
              }
              className="size-5 accent-burgundy"
            />
            {draft.kind === "category" ? "يظهر للزبون" : "متاح للزبون"}
          </label>

          <div className="mt-4">
            <span className="mb-1.5 block text-sm font-semibold text-burgundy-deep">
              {draft.kind === "category" ? "أيقونة التصنيف" : "صورة الصنف"}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt=""
                  className="size-16 rounded-2xl object-cover ring-1 ring-burgundy/10"
                />
              ) : null}
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-[#f7f1e4] px-4 text-sm font-semibold text-gold-deep ring-1 ring-inset ring-gold/30">
                <input
                  key={fileKey}
                  type="file"
                  accept={fileAccept}
                  onChange={chooseFile}
                  className="sr-only"
                />
                اختيار ملف
              </label>
              {file ? <span className="text-sm text-ink/55">{file.name}</span> : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/45">{fileHint}</p>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-burgundy">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-start gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl px-4 text-sm font-medium text-ink/55 underline-offset-4 hover:text-burgundy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-40"
            >
              تراجع
            </button>
            <ActionButton type="submit" disabled={pending} className="min-w-28">
              حفظ
            </ActionButton>
          </div>
        </form>
  );
}

export function MenuFormDialog({ draft, categories, pending, onSave, onDismiss }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (draft && !dialog.open) {
      dialog.showModal();
    } else if (!draft && dialog.open) {
      dialog.close();
    }
  }, [draft]);

  function handleBackdrop(event) {
    if (event.target === dialogRef.current && !pending) {
      dialogRef.current.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="menu-form-title"
      onClose={onDismiss}
      onCancel={(event) => {
        if (pending) {
          event.preventDefault();
        }
      }}
      onClick={handleBackdrop}
      className="m-auto max-h-[min(42rem,calc(100%-2rem))] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-[1.6rem] border-0 bg-paper p-5 text-ink shadow-[0_24px_60px_-28px_rgba(74,4,24,0.55)] backdrop:bg-ink/40"
    >
      {draft ? (
        <MenuFormBody
          key={draft.nonce}
          draft={draft}
          categories={categories}
          pending={pending}
          onSave={onSave}
          onClose={() => dialogRef.current?.close()}
        />
      ) : null}
    </dialog>
  );
}
