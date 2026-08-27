/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: gehealthcare (events.gehealthcare.com) section breaks + metadata.
 *
 * Inserts a section break (<hr>) before every non-first section boundary and a
 * Section Metadata block for every section that has a non-null `style`
 * (dark / grey / light-grey), using each template's sections[] from
 * page-templates.json (payload.template.sections). Section selectors are the
 * DOM-verified boundaries produced during page analysis.
 *
 * Uses BOTH hooks: block parsers run between beforeTransform and afterTransform
 * and may replace a section's boundary element (e.g. a section that wraps one
 * block). Breaks are inserted in beforeTransform while every section element
 * still exists, with a temporary marker attribute anchoring each styled
 * section's metadata block; metadata is inserted in afterTransform anchored to
 * the surviving marker (or the original element for the first section).
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

export default function transform(hookName, element, payload) {
  const sections = (payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before parsers can replace any section element.
    // Reverse iteration keeps every not-yet-processed section at the position
    // element.querySelector found it (inserts only affect later siblings).
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      // First section: no leading break. Only mark it if it needs metadata.
      if (i === 0 && !section.style) continue;

      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl) continue; // selector didn't match on this page — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to whichever still exists: the
    // marker <hr> placed above, or (first section, no marker inserted) the
    // original element itself.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || element.querySelector(section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}
