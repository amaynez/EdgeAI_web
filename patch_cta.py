with open('src/components/DynamicCTA.tsx', 'r') as f:
    content = f.read()

old = '''      {successMessage && (
        <div className="cta-message cta-success">
          {successMessage}
        </Wrapper>
      )}

      {errorMessage && (
        <div className="cta-message cta-error">
          {errorMessage}
        </Wrapper>
      )}'''

new = '''      {successMessage && (
        <div className="cta-message cta-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="cta-message cta-error">
          {errorMessage}
        </div>
      )}'''

content = content.replace(old, new)
content = content.replace("const Wrapper = isHero ? 'div' as any : 'section' as any;", "const Wrapper = isHero ? 'div' : 'section';")

with open('src/components/DynamicCTA.tsx', 'w') as f:
    f.write(content)
