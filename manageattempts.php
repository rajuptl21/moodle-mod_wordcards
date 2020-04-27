<?php

// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Action for adding/editing a wordcards attempt.
 *
 * @package mod_wordcards
 * @copyright  2014 Justin Hunt
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 **/

require_once(dirname(dirname(dirname(__FILE__))) . '/config.php');

use \mod_wordcards\constants;

global $USER, $DB;

// first get the nfo passed in to set up the page
$attemptid = optional_param('attemptid', 0, PARAM_INT);
$source = optional_param('source', 'attempts', PARAM_TEXT);
$n = required_param('n', PARAM_INT);         // instance ID
$action = required_param('action', PARAM_TEXT);

// get the objects we need
$moduleinstance = $DB->get_record(constants::M_TABLE, array('id' => $n), '*', MUST_EXIST);
$course = $DB->get_record('course', array('id' => $moduleinstance->course), '*', MUST_EXIST);
$cm = get_coursemodule_from_instance(constants::M_MODNAME, $moduleinstance->id, $course->id, false, MUST_EXIST);

//set up the page object url
$PAGE->set_url(constants::M_URL  . '/manageattempts.php', array('attemptid' => $attemptid, 'n' => $n, 'action' => $action));

//make sure we are logged in and can see this form
require_login($course, false, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/wordcards:manageattempts', $context);

//set up the page object
/*
$PAGE->set_title(format_string($moduleinstance->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);
$PAGE->set_pagelayout('course');
*/

//is the attempt if OK?
if ($action == 'delete' && $attemptid > 0) {
    $attempt = $DB->get_record(constants::M_ATTEMPTSTABLE, array('id' => $attemptid, 'modid' => $cm->instance), '*', MUST_EXIST);
    if (!$attempt) {
        print_error('could not find attempt of id:' . $attemptid);
    }
} else {
    $edit = false;
}

//we always head back to the readaloud attempts page
switch ($source) {
    case 'attempts':
    default:
        $redirecturl = new moodle_url(constants::M_URL . '/reports.php', array('report' => 'attempts', 'id' => $cm->id, 'n' => $n));
        break;

}
//handle delete actions
switch ($action) {

    /////// Delete attempt NOW////////
    case 'delete':
        require_sesskey();
        if (!$DB->delete_records(constants::M_ATTEMPTSTABLE, array('id' => $attemptid))) {
            print_error("Could not delete attempt");
        }

        redirect($redirecturl);
        return;

    /////// Delete ALL attempts ////////
    case 'deleteall':
        require_sesskey();
        if (!$DB->delete_records(constants::M_ATTEMPTSTABLE, array('modid' => $moduleinstance->id))) {
            print_error("Could not delete attempts (all)");
        }

        redirect($redirecturl);
        return;

}

//we should never get here
echo "You should not get here";