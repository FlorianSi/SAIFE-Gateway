/**
 * Compiles prompts while strictly mapping system and user roles.
 * Enforces separation of concerns between safety, persona, and didactic layers.
 */

import { TeacherFocusDirective } from './focus_directive';

export interface PromptLayers {
  safetyLayer: string;   // Layer 1
  personaLayer: string;  // Layer 2
  didacticLayer: string; // Layer 3
  userInput: string;     // Layer 4
  focusDirectives?: TeacherFocusDirective[];
}

export interface CompiledMessage {
  role: 'system' | 'user';
  content: string;
}

export class PromptCompiler {
  /**
   * Compiles layers into messages for LLM providers.
   * @param layers Distinct prompt layers.
   */
  public compile(layers: PromptLayers): CompiledMessage[] {
    this.validateLayers(layers);

    const systemContent = this.buildSystemContent(
      layers.safetyLayer,
      layers.personaLayer,
      layers.didacticLayer,
      layers.focusDirectives
    );

    return [
      { role: 'system', content: systemContent },
      { role: 'user', content: layers.userInput }
    ];
  }

  private buildSystemContent(safety: string, persona: string, didactic: string, focusDirectives?: TeacherFocusDirective[]): string {
    // Basic sanitization to prevent boundary collapse
    const sanitize = (text: string) => text.replace(/<\/?(safety_rules|persona|didactic_guidelines|teacher_focus)>/gi, '');
    
    let focusContent = '';
    if (focusDirectives && focusDirectives.length > 0) {
      const directivesList = focusDirectives.map(fd => {
        let str = `- Topic: ${sanitize(fd.focusTopic)}`;
        if (fd.preferredStrategy) str += ` (Strategy: ${fd.preferredStrategy})`;
        if (fd.targetObjectives?.length) {
          str += `\n  Objectives: ${fd.targetObjectives.map(o => sanitize(o)).join(', ')}`;
        }
        return str;
      }).join('\n');
      focusContent = `\n\n<teacher_focus>\nThese instructions take precedence over general didactic guidelines for the specified topics:\n${directivesList}\n</teacher_focus>`;
    }

    return `<safety_rules>\n${sanitize(safety)}\n</safety_rules>\n\n<persona>\n${sanitize(persona)}\n</persona>\n\n<didactic_guidelines>\n${sanitize(didactic)}${focusContent}\n</didactic_guidelines>`;
  }

  private validateLayers(layers: PromptLayers): void {
    if (!layers.userInput || layers.userInput.trim() === '') {
      throw new Error('User input layer cannot be empty.');
    }
    if (!layers.safetyLayer) {
      throw new Error('Safety layer (Layer 1) is strictly required.');
    }
  }
}
