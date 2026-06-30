/**
 * Compiles prompts while strictly mapping system and user roles.
 * Enforces separation of concerns between safety, persona, and didactic layers.
 */

// Removed TeacherFocusDirective import since directives are compiled before reaching the compiler

export interface PromptLayers {
  safetyLayer: string;   // Layer 1
  personaLayer: string;  // Layer 2
  didacticLayer: string; // Layer 3
  userInput: string;     // Layer 4
  compiledFocusDirectives?: string[];
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
      layers.compiledFocusDirectives
    );

    return [
      { role: 'system', content: systemContent },
      { role: 'user', content: `<user_input>\n${layers.userInput}\n</user_input>` }
    ];
  }

  private buildSystemContent(safety: string, persona: string, didactic: string, compiledFocusDirectives?: string[]): string {
    // Basic sanitization to prevent boundary collapse
    const sanitize = (text: string) => text.replace(/<\/?(safety_rules|persona|didactic_guidelines|teacher_focus)>/gi, '');
    
    let focusContent = '';
    if (compiledFocusDirectives && compiledFocusDirectives.length > 0) {
      const directivesList = compiledFocusDirectives.join('\n\n');
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
