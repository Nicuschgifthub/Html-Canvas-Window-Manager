class FGMBuildStructs {
    static build(key, input) {
        return _DEFS_STORE.defsBuilder[key](input);
    }
}