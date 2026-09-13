package com.rapidphoto.features.upload;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Checks that a stored object is the kind of file it was declared to be.
 *
 * The presigned upload path never sees the bytes: size and MIME type arrive as
 * client assertions and are written straight onto the Photo record. The old
 * proxied path validated both implicitly because the bytes passed through the
 * server, so moving them out removed the only chokepoint. This restores it at
 * the one moment the server can still look: after the object lands, before it
 * is accepted.
 */
public final class UploadValidation {

    private UploadValidation() {}

    /** Enough bytes to cover every signature below, HEIF brands included. */
    public static final int SNIFF_BYTES = 32;

    public static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/jpg", "image/png", "image/gif",
        "image/webp", "image/heic", "image/heif", "image/bmp", "image/tiff"
    );

    private static final Set<String> HEIF_BRANDS = Set.of(
        "heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"
    );

    public static boolean isAllowedMimeType(String mimeType) {
        return mimeType != null && ALLOWED_MIME_TYPES.contains(mimeType.toLowerCase(Locale.ROOT));
    }

    /**
     * The image type the bytes actually are, independent of any declaration.
     * Empty when the prefix matches no format we accept -- which covers an
     * executable, an archive, or a text file renamed to .jpg.
     */
    public static Optional<String> sniffImageType(byte[] prefix) {
        if (prefix == null || prefix.length < 12) {
            return Optional.empty();
        }

        if (startsWith(prefix, 0xFF, 0xD8, 0xFF)) {
            return Optional.of("image/jpeg");
        }
        if (startsWith(prefix, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return Optional.of("image/png");
        }
        if (startsWith(prefix, 0x47, 0x49, 0x46, 0x38)) {
            return Optional.of("image/gif");
        }
        if (startsWith(prefix, 0x42, 0x4D)) {
            return Optional.of("image/bmp");
        }
        if (startsWith(prefix, 0x49, 0x49, 0x2A, 0x00) || startsWith(prefix, 0x4D, 0x4D, 0x00, 0x2A)) {
            return Optional.of("image/tiff");
        }
        // WebP is a RIFF container; the format tag sits at offset 8.
        if (startsWith(prefix, 0x52, 0x49, 0x46, 0x46) && ascii(prefix, 8, 4).equals("WEBP")) {
            return Optional.of("image/webp");
        }
        // HEIF/HEIC: an ISO-BMFF box whose type is "ftyp", brand at offset 8.
        if (ascii(prefix, 4, 4).equals("ftyp") && HEIF_BRANDS.contains(ascii(prefix, 8, 4))) {
            return Optional.of("image/heic");
        }

        return Optional.empty();
    }

    /**
     * Whether sniffed content is consistent with what was declared.
     *
     * Deliberately compares families rather than exact strings: image/jpg and
     * image/jpeg are the same format, and HEIC and HEIF share a container. The
     * check that matters is "is this actually an image of the declared kind",
     * not "does the string match".
     */
    public static boolean matchesDeclaredType(String declared, String sniffed) {
        if (declared == null || sniffed == null) {
            return false;
        }
        return normalise(declared).equals(normalise(sniffed));
    }

    private static String normalise(String mimeType) {
        String lower = mimeType.toLowerCase(Locale.ROOT).trim();
        if (lower.equals("image/jpg")) return "image/jpeg";
        if (lower.equals("image/heif")) return "image/heic";
        return lower;
    }

    private static boolean startsWith(byte[] data, int... signature) {
        if (data.length < signature.length) return false;
        for (int i = 0; i < signature.length; i++) {
            if ((data[i] & 0xFF) != signature[i]) return false;
        }
        return true;
    }

    private static String ascii(byte[] data, int offset, int length) {
        if (data.length < offset + length) return "";
        return new String(data, offset, length, java.nio.charset.StandardCharsets.US_ASCII);
    }

    /** Formats accepted, for error messages and docs. */
    public static List<String> allowedTypesSorted() {
        return ALLOWED_MIME_TYPES.stream().sorted().toList();
    }
}
