# AUR package

`rhm2sspm-bin` repackages the `.deb` from GitHub Releases (no compiling --
just unpacks it to the right paths). Kept here as the source of truth;
the actual AUR listing is a separate git repo you push this to.

## First time: publishing it

1. Create an AUR account and add an SSH key: <https://aur.archlinux.org/register>
2. Clone the (empty) AUR repo for the package name:
   ```bash
   git clone ssh://aur@aur.archlinux.org/rhm2sspm-bin.git /tmp/rhm2sspm-bin-aur
   ```
3. Copy `PKGBUILD` and `.SRCINFO` from here into that clone, commit, push:
   ```bash
   cp PKGBUILD .SRCINFO /tmp/rhm2sspm-bin-aur/
   cd /tmp/rhm2sspm-bin-aur
   git add PKGBUILD .SRCINFO
   git commit -m "Initial import: 0.1.2"
   git push origin master
   ```

## Every new release: bumping the version

From this directory:

```bash
sed -i 's/^pkgver=.*/pkgver=X.Y.Z/; s/^pkgrel=.*/pkgrel=1/' PKGBUILD
updpkgsums          # refetches the new .deb + LICENSE and updates the checksums
makepkg -sf          # test build -- should finish with no errors
makepkg --printsrcinfo > .SRCINFO
```

Then copy `PKGBUILD` + `.SRCINFO` into your AUR clone (same as step 3 above),
commit with a message like `Update to X.Y.Z`, and push.

If only the packaging changed (not the app version), bump `pkgrel` instead
of `pkgver` (e.g. `pkgrel=2`) and skip `updpkgsums`.
