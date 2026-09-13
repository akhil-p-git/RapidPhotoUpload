package com.rapidphoto.features.upload;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Content sniffing, in isolation. These are the checks standing between the
 * bucket and a file that merely claims to be an image.
 */
class UploadValidationTest {

    private static byte[] withPadding(int... leadingBytes) {
        byte[] out = new byte[UploadValidation.SNIFF_BYTES];
        for (int i = 0; i < leadingBytes.length; i++) {
            out[i] = (byte) leadingBytes[i];
        }
        return out;
    }

    private static byte[] ascii(String s) {
        byte[] out = new byte[UploadValidation.SNIFF_BYTES];
        byte[] src = s.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        System.arraycopy(src, 0, out, 0, Math.min(src.length, out.length));
        return out;
    }

    @Test
    @DisplayName("recognises the formats the app accepts")
    void recognisesSupportedFormats() {
        assertEquals("image/jpeg", UploadValidation.sniffImageType(withPadding(0xFF, 0xD8, 0xFF, 0xE0)).orElseThrow());
        assertEquals("image/png", UploadValidation.sniffImageType(
            withPadding(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)).orElseThrow());
        assertEquals("image/gif", UploadValidation.sniffImageType(ascii("GIF89a")).orElseThrow());
        assertEquals("image/bmp", UploadValidation.sniffImageType(ascii("BM")).orElseThrow());
        assertEquals("image/webp", UploadValidation.sniffImageType(ascii("RIFF____WEBPVP8 ")).orElseThrow());
        assertEquals("image/heic", UploadValidation.sniffImageType(ascii("____ftypheic")).orElseThrow());
        assertEquals("image/tiff", UploadValidation.sniffImageType(withPadding(0x49, 0x49, 0x2A, 0x00)).orElseThrow());
    }

    @Test
    @DisplayName("an executable renamed to .jpg is not an image")
    void rejectsNonImageContent() {
        // ELF header -- the exact "declare 2MB image/jpeg, PUT a binary" case.
        assertTrue(UploadValidation.sniffImageType(withPadding(0x7F, 0x45, 0x4C, 0x46)).isEmpty());
        // Windows PE.
        assertTrue(UploadValidation.sniffImageType(ascii("MZ\u0090\u0000")).isEmpty());
        // Zip, which is also what an Office document or a JAR looks like.
        assertTrue(UploadValidation.sniffImageType(withPadding(0x50, 0x4B, 0x03, 0x04)).isEmpty());
        // Plain text.
        assertTrue(UploadValidation.sniffImageType(ascii("just some text here")).isEmpty());
    }

    @Test
    @DisplayName("too few bytes is treated as unrecognised, never as a pass")
    void rejectsShortPrefix() {
        assertTrue(UploadValidation.sniffImageType(new byte[0]).isEmpty());
        assertTrue(UploadValidation.sniffImageType(null).isEmpty());
        assertTrue(UploadValidation.sniffImageType(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}).isEmpty(),
            "a valid signature in a prefix too short to rule out other formats must not pass");
    }

    @Test
    @DisplayName("declared type is compared by format family, not by string")
    void matchesByFamily() {
        assertTrue(UploadValidation.matchesDeclaredType("image/jpg", "image/jpeg"));
        assertTrue(UploadValidation.matchesDeclaredType("IMAGE/JPEG", "image/jpeg"));
        assertTrue(UploadValidation.matchesDeclaredType("image/heif", "image/heic"));
        assertFalse(UploadValidation.matchesDeclaredType("image/jpeg", "image/png"));
        assertFalse(UploadValidation.matchesDeclaredType(null, "image/png"));
        assertFalse(UploadValidation.matchesDeclaredType("image/png", null));
    }

    @Test
    @DisplayName("only the documented types may be declared")
    void mimeAllowlist() {
        assertTrue(UploadValidation.isAllowedMimeType("image/jpeg"));
        assertTrue(UploadValidation.isAllowedMimeType("IMAGE/PNG"));
        assertFalse(UploadValidation.isAllowedMimeType("application/octet-stream"));
        assertFalse(UploadValidation.isAllowedMimeType("text/html"));
        assertFalse(UploadValidation.isAllowedMimeType("image/svg+xml"), "SVG can carry script");
        assertFalse(UploadValidation.isAllowedMimeType(null));
    }
}
